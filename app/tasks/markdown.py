from app.instances.celery import celery_app
from subprocess import Popen, PIPE, STDOUT
from misc import md_exe
from threading import local

markdown_local = local()

def fork_helper():
    if not (hasattr(markdown_local, 'render_proc') and markdown_local.render_proc is not None):
        markdown_local.render_proc = Popen(['node', md_exe], stdout=PIPE, stdin=PIPE)
    
    return markdown_local.render_proc

@celery_app.task
def render_markdown(string):
    helper = fork_helper()
    
    helper.stdin.write(string.encode('utf-8'))
    helper.stdin.flush()
    read_len = int.from_bytes(helper.stdout.read(4), byteorder='little')
    res = helper.stdout.read(read_len).decode('utf-8')
    
    return res