
import xml, xml.dom, xml.dom.minidom, urllib2, re, sys, calendar, string, time, dblp

text = sys.stdin.read()
if text.find("UPDATED)") >=0: sys.exit(0)
doc = xml.dom.minidom.parseString(text)
entry = doc.getElementsByTagName("entry")[0]
monthnames = "jan feb mar apr may jun jul aug sep oct nov dec".split()
dblpurl = "http://www.informatik.uni-trier.de/~ley/db/indices/a-tree/%s/%s:%s.html"

pubnode = doc.createElement("feedworld_mtime")
pubnode.appendChild(doc.createTextNode(str(calendar.timegm(time.gmtime()[:3]+(0,0,0)))))
entry.insertBefore(pubnode, entry.getElementsByTagName('summary')[0])
authfield = entry.getElementsByTagName("name")[0].firstChild
authlist = re.sub(re.compile("<[^>]*>"), "", dblp.unescapeHtml(authfield.toxml('utf-8')))
authlist = re.sub(" ?\([^\)]*\)", "", authlist)
authstr = dblp.formatAuthors(map(string.strip, authlist.split(",")))
authfield.data = ""
titlefield = entry.getElementsByTagName("title")[0].firstChild
titlefield.data = re.sub("\.* *\(arXiv:.*\)", "", titlefield.data)
text = entry.toxml('utf-8')
downloadurl = entry.getElementsByTagName("id")[0].firstChild.data.replace("abs", "pdf")
descr = '<p><b>Authors: </b>%s <br/><b>Download:</b> <a href="%s">PDF</a><br/><b>Abstract: </b>\\1</p>' % (authstr, downloadurl)
text = re.sub(re.compile("<p>(.*)</p>", re.S), descr, text)
print text.encode('utf-8')
