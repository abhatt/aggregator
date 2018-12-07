import urllib, urllib2, sys, operator, re, pickle
from xml.dom.minidom import parseString
from htmlentitydefs import codepoint2name as c2n

dblppref = "http://www.informatik.uni-trier.de/~ley/db/indices/a-tree/"
dblpurl = dblppref + "%s/%s:%s.html"
searchurl = "http://www.informatik.uni-trier.de/ley/dbbin/author"

def fetchPage(url, urlinfo = None, cache={}):
	if url in cache: return cache[url]
	if not urlinfo: 
		try:
			urlinfo = urllib2.urlopen(url)
		except:
			cache[url] = None
			return None
	try:
		cache[url] = urlinfo.read()
		return cache[url]
	except:
		cache[url] = None
		return None

def unescapeHtml(text):
	"""http://wiki.python.org/moin/EscapingHtml"""
	text = text.replace("&lt;", "<")
	text = text.replace("&gt;", ">")
	text = text.replace("&quot;", "\"")
	text = text.replace("&amp;", "&")
	text = re.sub("&#x([a-fA-F0-9]+);", lambda match: unichr(eval("0x" + match.groups()[0])), text)
	return text

def getElements(root, tag, attrdict):
	return filter(\
		lambda e: all(e.attributes.has_key(key) and  e.attributes[key].value == val for key, val in attrdict.items()),\
		root.getElementsByTagName(tag))

def getElement(root, tag, attrdict):
	elts = getElements(root, tag, attrdict)
	assert len(elts) <= 1
	return elts[0] if len(elts) == 1 else None

def searchName(name):
	lastname = name.split()[-1]
	if len(lastname) <= 1: return None
	try: urlinfo = urllib2.urlopen(urllib2.Request(searchurl, urllib.urlencode({"author":lastname})))
	except: return None
	if urlinfo.url != searchurl: return urlinfo.url
	try:
		text = re.sub("&[a-z]*;", "", re.sub("<li>(.*)\n", "<li>\\1</li>\n", 
			re.sub("<hr>", "<hr></hr>", re.sub("<img [^>]*>", "", urlinfo.read()))))
		links = [elem.firstChild for elem in parseString(text).getElementsByTagName("li")]
	except:
		return None
	return findMatch(name, dict((link.firstChild.data, link.attributes["href"].value) for link in links))

def getCoauthors(url):
	try: docroot = parseString(re.sub("&[a-z]*;", "", fetchPage(url)))
	except: return {}
	return dict((elem.firstChild.firstChild.data,elem.firstChild.attributes["href"].value.replace("../", dblppref)) for elem in\
		getElements(docroot, "td",{"class":"coauthor"}))

def normalizeName(fullname):
	return re.sub(" ?\([^\)]*\)", "", re.sub(re.compile("\.([A-Z])"), ". \\1", fullname))

def getUrl(fullname):
	names = fullname.replace('-','=').replace(".","=").split()
	lastname = names[-1]
	url = dblpurl % (lastname[0].lower(), lastname, "_".join(names[:-1]))
	try: url = url.decode('utf-8')
	except: pass
	url = "".join([("=%s=" % c2n[code] if code in c2n else ch) for (code, ch) in ((ord(ch), ch) for ch in url)])
	try:
		urllib2.urlopen(url)
		return url
	except:
		return searchName(fullname)

def match(name1, name2, recur=True):
	def matchWord(w1, w2):
		if w1.endswith("."):
			w1 = w1[:-1]
			w2 = w2[:len(w1)]
			return matchWord(w2, w1)
		return w1 == w2

	if recur:
		name1, name2 = name1.lower().split(), name2.lower().split()
		notInitial = lambda word: not word.endswith(".")
		if match(filter(notInitial, name1), filter(notInitial, name2), False): return True
	if len(name1) != len(name2) or len(name1) < 2: return False
	return all(matchWord(w1, w2) for w1, w2 in zip(name1, name2))

def findMatch(name, urlmap):
	"""try to match name in a name:url dict and return corresponding url"""
	matches = [url for othername, url in urlmap.items() if match(name, othername)]
	return matches[0] if len(matches) == 1 else None

def getHomes(urlmap):
	def parseHome(text):
		if text is None: return None
		match = re.compile("<a href=\"(.*)\">Home Page</a>").search(text)
		if match: return match.groups()[0]
		return None
	return dict((name, parseHome(fetchPage(url)) if url else None) for name, url in urlmap.items())

def formatAuthors(names):
	names = map(normalizeName, names)
	urlmap = dict((name, getUrl(name)) for name in names)
	coauthors = dict(reduce(operator.add, (getCoauthors(url).items() for url in urlmap.values() if url), []))
	for name in names:
		if not urlmap[name]:
			urlmap[name] = findMatch(name, coauthors)
	homemap = getHomes(urlmap)
	return ", ".join(('<a href="%s">%s</a>%s' % (urlmap[name], name, 
			'<a href="%s"><img class="homeicon" src="images/homeicon.png"/></a>' % homemap[name] if homemap[name] else "")
			if urlmap[name] else name) for name in names)

_authorcache = None
_newentries = 0
def formatAuthor(name):
	#FIXME: don't store formatting in the cache
	cachefile = "/var/cache/dblp/namemap"
	global _authorcache, _newentries
	if not _authorcache:
		try: _authorcache = pickle.load(open(cachefile))
		except: _authorcache = {}
	if name in _authorcache:
		return _authorcache[name]
	_authorcache[name] = formatAuthors([name])
	_newentries += 1
	if _newentries >= 8:
		try:
			pickle.dump(_authorcache, open(cachefile, "w"))
			_newentries = 0
		except:
			pass
	return _authorcache[name]
