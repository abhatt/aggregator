#!/usr/bin/python
from __future__ import with_statement

import urllib2, time
from BeautifulSoup import BeautifulSoup as Soup

#from functools import *
#from itertools import *

#import status, utils, graphing
#from pype import *
#from pypethread import *


url = 'http://cstheory.stackexchange.com/feeds'

def main(req, **kwargs):
	s=Soup(urllib2.urlopen(url))

	entries=s.findAll('entry')

	for e in entries:
		if int(e.find('re:rank').string) < 12:
			e.extract()

	return s.prettify()
