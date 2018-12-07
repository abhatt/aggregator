
import xml, xml.dom, xml.dom.minidom, urllib2, re, sys, calendar, string, dblp

text = sys.stdin.read()
doc = xml.dom.minidom.parseString(text)
entry = doc.getElementsByTagName("entry")[0]
monthnames = "jan feb mar apr may jun jul aug sep oct nov dec".split()

try:
	authstr = entry.getElementsByTagName("summary")[0].firstChild.data.split("\n")[0]
except:
	authstr = ""
#authstr = ", ".join(map(dblp.formatAuthor, authstr.split(",")))
authstr = dblp.formatAuthors(map(string.strip, authstr.split(",")))
	
url = entry.getElementsByTagName("id")[0].firstChild.data
f = urllib2.urlopen(url)
data = f.read()
match = re.compile("accepted on ([^.]+)\..*Contact.*<TT>(.*)</TT>.*Abstract: </B>(.*)\n</TD>.*Keywords", re.S).search(data)
date, contact, abstract = match.groups()
month, day, year = date.split()
month = monthnames.index(month.lower()[:3])+1
day = int("".join(d for d in day if d in string.digits))
year = int(year)
for item in entry.getElementsByTagName('updated'):
	item.firstChild.data = "%d-%d-%d" % (year,month,day)
pubnode = doc.createElement("feedworld_mtime")
pubnode.appendChild(doc.createTextNode(str(calendar.timegm((year, month, day, 0, 0, 0)))))
entry.insertBefore(pubnode, entry.getElementsByTagName('updated')[0])
titlefield = entry.getElementsByTagName("title")[0].firstChild
titlefield.data = re.sub("TR\d+-\d+: *", "", titlefield.data)
text = entry.toxml('utf-8')
downloadurl = re.sub(re.compile("index.html", re.S), entry.getElementsByTagName("link")[0].attributes["href"].value.split("/")[-1], url)
descr = """<summary type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">
			<b>Authors:</b> %s<br/>
			<b>Download:</b> 
			<a href="%s">PDF</a><br/><b>Abstract: </b>%s
		</div></summary>""" % (authstr, downloadurl, abstract)
text = re.sub(re.compile("<summary>.*</summary>", re.S), descr, text)
text = re.sub(re.compile("</id>", re.S), '</id><link href="%s" rel="alternate" type="text/html"/>' % url, text)
print text.encode('utf-8')
