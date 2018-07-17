from app.instances.db import db
from sqlalchemy import func
from sqlalchemy.ext.hybrid import hybrid_property
import app.models.Language
from app.models.AnswerRevision import AnswerRevision
from app.helpers.macros.score import confidence
import datetime
from config import answers


class Answer(db.Model):
    """
    An answer posted to a post by a user.
    """

    __tablename__ = 'answers'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)

    language_id = db.Column(db.String(answers['lang_len']), nullable=True, default=None)
    language_name = db.Column(db.String(answers['lang_len']), nullable=True, default=None)

    code = db.Column(db.Text, default=None, nullable=True)
    commentary = db.Column(db.Text, default=None, nullable=True)
    encoding = db.Column(db.String(30), default='UTF-8')
    deleted = db.Column(db.Boolean, nullable=False, default=False)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.datetime.now)

    user = db.relationship('User', backref='answers')
    post = db.relationship('Post', backref='answers', lazy=True)

    @hybrid_property
    def byte_len(self):
        return len(self.code.encode(self.encoding or 'utf8'))

    @byte_len.expression
    def byte_len(cls):
        return func.length(cls.code)

    @hybrid_property
    def score(self):
        ups = sum(vote for vote in self.votes if vote.vote == 1)
        downs = sum(vote for vote in self.votes if vote.vote == -1)
        return confidence(ups, downs)

    def to_json(self, no_code=False):
        data = {}

        if not no_code:
            data['code'] = self.code
            data['commentary'] = self.commentary

        data['id'] = self.id
        data['encoding'] = self.encoding
        data['byte_len'] = self.byte_len

        language = self.get_language()
        if language is not None:
            data['lang'] = language.to_json()

        data['owner'] = self.user.to_json()

        data['date_created'] = self.date_created.isoformat()

        data['deleted'] = self.deleted

        return data

    def get_language(self):
        if self.language_id is None:
            return None

        return app.models.Language.Language(self.language_id)

    def revise(self, user, **new_answer_data):
        revision = AnswerRevision(answer_id=self.id,
                                  language_id=self.language_id,
                                  language_name=self.language_name,
                                  code=self.code,
                                  commentary=self.commentary,
                                  encoding=self.encoding,
                                  deleted=self.deleted,
                                  user_id=user.id)

        if 'code' in new_answer_data:
            self.code = new_answer_data['code']

        if 'commentary' in new_answer_data:
            self.commentary = new_answer_data['commentary']

        if 'encoding' in new_answer_data:
            self.encoding = new_answer_data['encoding']

        if 'deleted' in new_answer_data:
            self.deleted = new_answer_data['deleted']

        return self, revision

    def __repr__(self):
        return '<Answer(%r) by %r %s>' % (self.id, self.user.name, "(deleted)" if self.deleted else "")
