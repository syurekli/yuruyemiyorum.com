import base64
import cgi
from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext import db
import jinja2
import json
import logging
import os
import re
import webapp2

# Set up the template environment.
_paragraph_re = re.compile(r'(?:\r\n|\r|\n){2,}')


@jinja2.evalcontextfilter
def nl2br(eval_ctx, value):
  result = u'\n\n'.join(u'<p>%s</p>' % p.replace('\n', '<br>\n') 
    for p in _paragraph_re.split(jinja2.escape(value)))
  if eval_ctx.autoescape:
    result = jinja2.Markup(result)
  return result


jinja2_env = jinja2.Environment(
    autoescape=True,
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),
																								'templates')))
jinja2_env.filters['nl2br'] = nl2br


class Marker(db.Model):
  latlng = db.GeoPtProperty(required=True)    
  image = blobstore.BlobReferenceProperty(required=True)
  comment = db.TextProperty()
    

class FormHandler(webapp2.RequestHandler):
  def get(self):
    template = jinja2_env.get_template('form.html')
    self.response.out.write(template.render({
        'url': blobstore.create_upload_url('/submit'),
        'lat': self.request.GET['lat'],
        'lng': self.request.GET['lng'],
    }))

    
class SubmitHandler(blobstore_handlers.BlobstoreUploadHandler):
  def post(self):
    marker = Marker(
        latlng=db.GeoPt(self.request.get('lat'), self.request.get('lng')),
        image=self.get_uploads()[0].key(),
        comment=db.Text(self.request.get('comment')))
    db.put(marker)
    template = jinja2_env.get_template('submit.html');
    self.response.out.write(template.render({'marker_id' : marker.key().id()}))


class MarkerHandler(webapp2.RequestHandler):
  def get(self):
    template = jinja2_env.get_template('marker.html')
    marker = Marker.get_by_id(int(self.request.get('id')))
    self.response.out.write(template.render({
        'image_key' : marker.image.key(),
        'comment' : marker.comment
    }))


class ListHandler(webapp2.RequestHandler):
  def get(self):
    markers =  [{
        'key': m.key().id(),
        'lat': m.latlng.lat,
        'lng': m.latlng.lon
    } for m in Marker.all().run()]  
    self.response.content_type = 'application/json'
    self.response.out.write(json.dumps(markers))
      

class ImageHandler(blobstore_handlers.BlobstoreDownloadHandler):
  def get(self, image_key):
    self.send_blob(image_key)

app = webapp2.WSGIApplication([
    ('/xform', FormHandler),
    ('/submit', SubmitHandler),
    ('/marker', MarkerHandler),
    ('/list', ListHandler),
    ('/image/([^/]+)?', ImageHandler)
], debug=True)
