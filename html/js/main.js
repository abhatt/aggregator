getElements = getElementsByTagAndClassName;
function getElement(tag, cls, elem){
	return getElements(tag, cls, elem)[0];
}

function formatTime(millis){
	var minutes = Math.floor(millis / 1000 / 60);
	minutes = Math.floor(minutes / 5) * 5;
	if (minutes == 0) return "just a moment ago";
	var agostr = minutes < 0 ? "in the future" : "ago";
	minutes = Math.abs(minutes);
	var hours = Math.floor(minutes / 60) % 24;
	var days = Math.floor(minutes / 60 / 24);
	minutes = minutes % 60;

	function formatSingle(unit){
		var val = eval(unit + "s");
		if (val == 0) return "";
		if (val == 1) return val + " " + unit;
		return val + " " + unit + "s";
	}

	function formatDouble(unit1, unit2){
		var val = eval(unit1 + "s");
		if (val > 1) return formatSingle(unit1);
		return formatSingle(unit1) + " " + formatSingle(unit2);
	}

	return (days ? formatDouble("day", "hour") : formatDouble("hour", "minute")) + " " + agostr;
}

function updateTime(entry){
	//TODO: detect if we've already updated
	var elem = getElements("span","datestr",entry)[0];
	var millis = Date.parse(Date()) - Date.parse(elem.innerHTML.substr(3));
	elem.innerHTML = formatTime(millis);
	entry._age = millis / 1000;
}

function toggleShow(element){
	element.style.display = element.style.display == "none" ? "block" : "none";
}

function toggleContent(entry){
	if (!window.linkclicked){
		toggleShow(getElement("div","entry",entry));
		toggleShow(getElement("p","whitespace",entry));
	}
	window.linkclicked=false;
}

function getComments(entry){
	function showComments(data){
		function row(edict, idx) {
			td = TD({'class':'comment'});
			td.innerHTML = edict.content + "<p/><i>by <b>" + edict.author + "</b> " + 
				formatTime(Date.parse(Date()) - Date.parse(edict.published)) + "</i>";
			return TR({'class':'comment ' + (idx % 2 ? "odd":"even")}, td);
		}
		carea = getElement("div","comments", entry);
		carea.appendChild(createDOM("H4", {}, "Comments"));
		carea.appendChild(TABLE({'class': 'comment'},  TBODY(null, imap(row, data, count()))));
		getElement('a','showhide',entry).onclick = partial(toggleShow, carea);
		getElement('a','showhide',entry).innerHTML = "Show/hide comments";
	}
	loadJSONDoc(entry.commenturl).addCallback(showComments);
}

function hideContent(entry){
	var maxage = 3 * 86400;
	var content = getElements("div","entry",entry)[0];
	//if (entry._age > maxage)
	hideElement(content);
	content.parentNode.appendChild(P({"class":"whitespace"}, BR()));
	var header = getElements("div","entryheader",entry)[0];
	header.appendChild(SPAN({"class":"showhide"}, "Click to show/hide"));
	header.onclick = partial(toggleContent, entry);
	var links = getElements("a","entryheader",entry);
	for (i in links)
		links[i].onclick = function(){window.linkclicked=true};
}

function showCommentCount(data){
	for (var i in entries){
		var elem = getElement("span","commentbutton",entries[i]);
		if (!elem) continue;
		var url = elem.attributes.href.value;
		if (!(url in data)) continue;
		var cnt = data[url].length;
		entries[i].commenturl = "comments/" + data[url].hash + ".json";
		var viewlink = A({'class':'showhide'}, "Show comments");
		viewlink.onclick = partial(getComments, entries[i]);
		var viewelems = cnt > 0 ? [viewlink, " | "] : null;
		elem.appendChild(createDOM("SPAN", null, 
			cnt + (cnt == 1 ? " comment" : " comments") + " | ", viewelems));
	}
}

function onLoadCb(){
	var minshown = 8;
	window.entries = getElements("div","entrygroup",document);
	map(updateTime, entries);
	updateTime(getElements("div","sidebar")[0]);
	map(hideContent, entries.slice().splice(minshown,1000));
	jsonurl = "comments/index.json";
	loadJSONDoc(jsonurl).addCallback(showCommentCount);
}
