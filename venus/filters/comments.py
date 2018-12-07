
import urllib2, re, sys, calendar, string, dblp, xml, cgi
from xml.dom.minidom import parseString

text = sys.stdin.read()
doc = parseString(text)

try: selfurl = cgi.escape(dblp.getElement(doc, "link", {"rel":"self"}).attributes["href"].value)
except: selfurl = None
try: posturl = cgi.escape(dblp.getElement(doc, "link", {"rel":"replies", "type":"text/html"}).attributes["href"].value)
except: posturl = None
try: feedurl = cgi.escape(dblp.getElement(doc, "link", {"rel":"replies", "type":"application/atom+xml"}).attributes["href"].value)
except: feedurl = None
commentstr = '<div class="commentbar"><p/>%s%s%s%s</div>' % \
	(	'<span class="commentbutton" href="%s"></span>' % feedurl if feedurl else "",\
		'<a href="%s"><img class="commenticon" src="/images/feed-icon.png"/> Subscribe to comments</a>' % feedurl if feedurl else "",\
		"<![CDATA[  | ]]>" if posturl and feedurl else "",\
		'<a href="%s"><img class="commenticon" src="/images/post-icon.png"/> Post a comment</a>' % posturl if posturl else "")
		#'<div class="commentarea" href="%s"></div>' % feedurl if feedurl else "")

addCommentStr = lambda elems: elems[0].appendChild(parseString(commentstr).firstChild) if len(elems) > 0 else None
addCommentStr(doc.getElementsByTagName("summary")) or addCommentStr(doc.getElementsByTagName("content"))
print doc.toxml('utf-8')
