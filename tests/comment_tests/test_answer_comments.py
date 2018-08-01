from tests.test_base import TestFlask
from app.models.Post import Post
from app.models.Answer import Answer
from app.models.AnswerComment import AnswerComment
from app.models.User import User
from app.session.user_session import set_session_user
from flask import g
import config

# this is necessary, but PyCharm disagrees
# noinspection PyUnresolvedReferences
from app.routes import *


class TestAnswerComments(TestFlask):

    def setUp(self):
        super().setUp()

        self.session.begin_nested()

        self.user = User(name="Test User", email="test@example.com")
        self.post = Post(title="Test Post", body="Test Post", user_id=self.user.id)
        self.answer = Answer(post_id=self.post.id, user_id=self.user.id)
        self.user.posts.append(self.post)
        self.user.answers.append(self.answer)
        self.post.answers.append(self.answer)

        self.session.add(self.user)
        self.session.add(self.post)
        self.session.add(self.answer)

        self.session.commit()

        with self.client as c:
            with c.session_transaction() as sess:
                set_session_user(self.user, current_session=sess)
                g.user = self.user

    def test_answer_comment_model(self):
        self.session.begin_nested()

        current_answer_comment_count = len(self.answer.comments)
        current_user_comment_count = len(self.user.answer_comments)

        test_comment = AnswerComment(answer_id=self.answer.id, text="foobar", user_id=self.user.id)
        self.user.answer_comments.append(test_comment)
        self.answer.comments.append(test_comment)

        self.assertEqual(test_comment.user.id, self.user.id)
        self.assertEqual(test_comment.text, "foobar")
        self.assertEqual(test_comment.answer_id, self.answer.id)
        self.assertEqual(len(self.answer.comments)-current_answer_comment_count, 1)
        self.assertEqual(len(self.user.answer_comments)-current_user_comment_count, 1)

    def test_make_answer_comment(self):
        self.session.begin_nested()

        short_result = self.client.post(f'/answer/{self.answer.id}/comment', data={"comment_text": "f"})
        self.assert400(short_result)

        long_result = self.client.post(f'/answer/{self.answer.id}/comment',
                                       data={"comment_text": "a"*(config.comments.get('max_len', 140)+1)})
        self.assert400(long_result)

        result = self.client.post(f'/answer/{self.answer.id}/comment', data={"comment_text": "foobarbazblargh"})
        self.assert200(result)

        comment_id = self.answer.comments[0].id
        comment_result = self.client.get(f"/answer/{self.answer.id}/comment/{comment_id}")
        self.assert200(comment_result)
        self.assertEqual(comment_result.json['text'], "foobarbazblargh")

    def test_nested_answer_comments_model(self):
        self.session.begin_nested()

        parent = AnswerComment(answer_id=self.answer.id, text="this is the parent comment", user_id=self.user.id)
        child_a = AnswerComment(answer_id=self.answer.id, text="this is a child comment", user_id=self.user.id,
                                parent_id=parent.id)
        child_b = AnswerComment(answer_id=self.answer.id, text="this is b child comment", user_id=self.user.id,
                                parent_id=parent.id)
        child_c = AnswerComment(answer_id=self.answer.id, text="this is c child comment", user_id=self.user.id,
                                parent_id=child_a.id)

        parent.children.append(child_a)
        parent.children.append(child_b)
        child_a.children.append(child_c)
        self.session.add(parent)
        self.session.add(child_a)
        self.session.add(child_b)
        self.session.add(child_c)

        self.session.commit()

        comment_tree = parent.comment_tree()
        test_tree = [parent, [[child_a, [child_c]], child_b]]

        self.assertSequenceEqual(comment_tree, test_tree)
