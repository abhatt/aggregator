
import xml.dom.minidom, sys, re, dblp

def matchCat(catstr, catvar):
	if catstr[0] != "$": return len(set(cat.strip() for cat in catstr.split(",")) & set(eval(catvar))) > 0
	return eval(re.sub(re.compile('("[^"]*")'), "\\1 in %s" % catvar, catstr[1:]))

if __name__ == "__main__":
	text = sys.stdin.read()
	entry = xml.dom.minidom.parseString(text).firstChild

	catstr=dict(zip([name.lstrip('-') for name in sys.argv[1::2]], sys.argv[2::2]))["cats"].lower()
	cats = [elem.attributes["term"].value.strip().lower() for elem in entry.getElementsByTagName("category")]

	if matchCat(catstr, "cats"):
		print text
