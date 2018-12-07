import sys

from BeautifulSoup import BeautifulSoup as Soup

soup = Soup(sys.stdin)

for e in soup.findAll('entry'):
	titletag = e.find('title') or None
	sourcetitletag = e.find('source') and (e.find('source').find('title') or None) or None
	newtitle = (titletag.string if titletag else '') + u' \253 ' + (sourcetitletag.string if sourcetitletag else '')
	if titletag:
		titletag.contents[0] = Soup(newtitle)

print soup
