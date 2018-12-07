
import xml, xml.dom, xml.dom.minidom, urllib2, re, sys

text = sys.stdin.read()
monthnames = "jan feb mar apr may jun jul aug sep oct nov dec".split()
dblpurl = "http://www.informatik.uni-trier.de/~ley/db/indices/a-tree/%s/%s:%s.html"
ecccurl = "http://eccc.hpi-web.de/eccc/feed.xml"

try:
	text = urllib2.urlopen(ecccurl).read()
	doc = xml.dom.minidom.parseString(text)
	entries = doc.getElementsByTagName("item")
except:
	sys.exit(1)


try:
	authstr = entry.getElementsByTagName("summary")[0].firstChild.data.split("\n")[0]
except:
	authstr = ""
def formatAuthor(aname):
	try: firstname, lastname = aname.split()
	except: return aname
	return '<a href="%s">%s</a>' % (dblpurl % (lastname[0].lower(), lastname, firstname), aname)
authstr = ", ".join(map(formatAuthor, authstr.split(",")))
	
url = entry.getElementsByTagName("id")[0].firstChild.data
f = urllib2.urlopen(url)
data = f.read()
match = re.compile("accepted on ([^.]+)\..*Contact.*<TT>(.*)</TT>.*Abstract: </B>(.*)\n</TD>.*Keywords", re.S).search(data)
date, contact, abstract = match.groups()
month, day, year = date.split()
month = str(monthnames.index(month.lower()[:3])+1)
day = day[:-1]
for item in entry.getElementsByTagName('updated'):
	item.firstChild.data = "%s-%s-%s" % (year,month,day)
pubnode = doc.createElement("published")
pubnode.appendChild(doc.createTextNode("%s-%s-%s" % (year,month,day)))
entry.insertBefore(pubnode, entry.getElementsByTagName('updated')[0])
text = entry.toxml('utf-8')
downloadurl = re.sub(re.compile("index.html", re.S), entry.getElementsByTagName("link")[0].attributes["href"].value.split("/")[-1], url)
descr = '<summary><b>Authors:</b> %s<br/><b>Download:</b> <a href="%s">PDF</a><br/><b>Abstract: </b>%s</summary>' % (authstr, downloadurl, abstract)
text = re.sub(re.compile("<summary>.*</summary>", re.S), descr, text)
text = re.sub(re.compile("</id>", re.S), '</id><link href="%s" rel="alternate" type="text/html"/>' % url, text)
print text.encode('utf-8')
