#!/usr/bin/python

import dblp, copy, urllib2, time, sys, xml, socket, json, hashlib, pickle, re
from xml.dom.minidom import parse
from iso8601 import parse_date as parseDate

def getHash(string):
	h = hashlib.sha1()
	h.update(string)
	return h.hexdigest()

class Struct: pass

socket.setdefaulttimeout(10)
opts = Struct()

def loadConf(configfile):
	global opts
	for line in open(configfile):
		try:
			key, val = line.split('=')
			setattr(opts, key.strip(), val.strip())
		except:
			pass
	return opts

def getUrls(opts=opts):
	text = open(opts.output_dir + "/atom.xml").read()
	doc = xml.dom.minidom.parseString(text)
	urls = [elem.attributes["href"].value for elem in\
		dblp.getElements(doc, "link", {"rel":"replies", "type":"application/atom+xml"})]
	#hack: dupes are probably because of misconfigured rel:replies urls
	dupes = copy.copy(urls) 
	for url in set(urls): dupes.remove(url)
	urls = set(urls) - set(dupes)
	return list(urls)

def updateCache(urls, opts=opts):
	cachefile = opts.cache_directory + "comments"
	try: postcache = pickle.load(open(cachefile))
	except: postcache = {}
	for url in urls:
		def needsUpdate(published, updated, numentries):
			#TODO: need better heuristic, consider number of comments too
			if time.time() - updated < 600: return False
			if time.time() - published > (time.time() - updated) * 10 * (numentries ** 0.5 + 1): return False
			return True
		if url not in postcache or needsUpdate(postcache[url].published, postcache[url].updated, len(postcache[url].entries)):
			entries = processUrl(url)
			if entries is None: entries = []
			if url in postcache:
				oldids = set(id for id, entry in postcache[url].entries)
				postcache[url].entries += [e for e in entries if e[0] not in oldids]
			else:
				postcache[url] = Struct()
				postcache[url].entries = entries
				postcache[url].published = time.time()
				postcache[url].hash = getHash(url)[:8]
			postcache[url].updated = time.time()
		def tag2Text(tag, entry):
			text = dblp.unescapeHtml(entry.getElementsByTagName(tag)[0].toxml('utf-8'))
			text = re.sub(re.compile("</?%s[^>]*>"%tag), "", text)
			if tag == "author":
				text = re.compile("<name>(.*)</name>").search(text).groups()[0]
				if len(text.split()) > 1:
					#FIXME: added this hack to fix some error, not sure why it happens
					text = unicode(text, errors='ignore')
					text = dblp.formatAuthor(text.encode('utf-8'))
			if tag == "published":
				print text, str(parseDate(text))
				return str(parseDate(text))
			if tag == "title" and text.endswith("..."):
				return ""
			return text
		#TODO: delete everything from this directory
		open(opts.output_dir + "comments/" + postcache[url].hash + ".json", "w").write(json.dumps([\
			dict((tag, tag2Text(tag, e[1])) for tag in "title author content published".split())\
				for e in postcache[url].entries]))
	try:
	   pickle.dump(postcache, open(cachefile, "w"))
	   sys.stderr.write("wrote %s\n" % cachefile)
	except:
		pass
	return postcache
	
def main():
	loadConf(sys.argv[1])
	urls = getUrls()
	postcache = updateCache(urls)
	
	index = dict((url, {'length':len(postcache[url].entries), 'hash':postcache[url].hash}) for url in urls if url in postcache) 
	open(opts.output_dir + "comments/index.json", "w").write(json.dumps(index))

def processUrl(url):
	try: entries = parse(urllib2.urlopen(url)).getElementsByTagName("entry")
	except: return None
	entries.reverse()
	def findId(entry):
		id = None
		try: id = entry.getElementsByTagName("id")[0].firstChild.data
		except:
			try: id = dblp.getElement(entry, "link", {"rel":"self"}).attributes["href"].value
			except: pass
		return id
	return [(id, e) for id, e  in zip(map(findId, entries), entries) if id]

if __name__ == "__main__": main()
