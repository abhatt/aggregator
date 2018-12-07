#
# Ensure that all headings are below a permissible maximum (like h3).
# If not, all heading levels will be changed to conform.
# Note: this may create "illegal" heading levels, like h7 and beyond.
#

import sys
from xml.dom import minidom, XHTML_NAMESPACE

# parse input stream
doc = minidom.parse(sys.stdin)

# search for headings below the permissable minimum
if doc.getElementsByTagName('guid'):

# if found, bump all headings so that the top is the permissible minimum
if first < minhead:
  for i in range(6,0,-1):
    for oldhead in doc.getElementsByTagName('h%d' % i):
      newhead = doc.createElementNS(XHTML_NAMESPACE, 'h%d' % (i+minhead-first))
      for child in oldhead.childNodes:
        newhead.appendChild(child)
      oldhead.parentNode.replaceChild(newhead, oldhead)

# return (possibly modified) document
print doc.toxml('utf-8')
