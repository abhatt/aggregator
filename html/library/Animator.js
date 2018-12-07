/***

MochiKit.Animator 0.9.2

Copyright (c) 2006 Karl Guertin <grayrest@gr.ayre.st>, all rights reserved.

This is a derivative work of
    animator.js written by Bernard Sumption (http://www.berniecode.com)
                and licensed under the Creative Commons Attribution 2.0 license.

A majority of the easing equations are courtesy Robert Penner, <http://www.robertpenner.com/easing/>
    Easing Equations v1.5, (c) 2003 Robert Penner, all rights reserved. Open Source BSD License.

All other code is released under the terms of the MIT License or the Academic Free License v2.1.

***/
if (typeof(dojo) != 'undefined') {
    dojo.provide('MochiKit.Animator');
    dojo.require('MochiKit.Base');
    dojo.require('MochiKit.Iter');
    dojo.require('MochiKit.DOM');
    dojo.require('MochiKit.Style');
    dojo.require('MochiKit.Color');
}

if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Base", []);
    JSAN.use("MochiKit.Iter", []);
    JSAN.use("MochiKit.DOM", []);
    JSAN.use("MochiKit.Style", []);
    JSAN.use("MochiKit.Color", []);
}

try {
    if (typeof(MochiKit.Base) === 'undefined' ||
        typeof(MochiKit.Iter) === 'undefined' ||
        typeof(MochiKit.DOM) === 'undefined'||
        typeof(MochiKit.Style) === 'undefined'||
        typeof(MochiKit.Color) === 'undefined') {
        throw "";
    }
} catch (e) {
    throw new Error("MochiKit.Animator depends on MochiKit.Base, MochiKit.Iter, MochiKit.DOM, MochiKit.Style, and MochiKit.Color");
}

if (typeof(MochiKit.Animator) == "undefined") {
    MochiKit.Animator = {};
}

MochiKit.Animator.NAME = "MochiKit.Animator";
MochiKit.Animator.VERSION = "0.9.2";

MochiKit.Animator.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};

MochiKit.Animator.toString = function () {
    return this.__repr__();
};

/** @id MochiKit.Animator.Animation */
MochiKit.Animator.Animation = function(options){
    this.__init__(options);
};

MochiKit.Animator.Animation.prototype = {
    __init__:   function(options){
        this.setOptions(options);
        this.timerDelegate = MochiKit.Base.bind(this._onTimerEvent,this);
        this.subjects = [];
        this.target = 0;
        this.state = 0;
        this._direction = 0;
        this._prev = null;
        this._next = null;

        //these aliases are for animator.js code compat.
        this.addEffect = this.addSubject;
        this.removeEffect = this.removeSubject;
        this.clearEffects = this.clearSubjects;
    },
    /** @id MochiKit.Animator.Animation.setOptions */
    setOptions: function(options){
        this.options = MochiKit.Base.update({
            interval: 40,  // time between animation frames
            duration: 400, // length of animation,
            onComplete: function(){},
            onForward: function(){},
            onBackward: function(){},
            onStep: function(){},
            transition: MochiKit.Animator.transitions.easeInOut
        },options);
    },
    /** @id MochiKit.Animator.Animation.seekTo */
    seekTo: function(to,_direction){
        return this.seekFromTo(this.state,to,_direction);
    },
    /** @id MochiKit.Animator.Animation.seekFromTo */
    seekFromTo: function(from,to,_direction){
        this.target = Math.max(0, Math.min(1, to));
        this.state = Math.max(0, Math.min(1, from));

        var pres = 0;
        var nres = 0;
        //Maintain the invariant. If we're seeking, all previous nodes must have their state == 1.
        if(this._prev && _direction != this._playDirection.REVERSE){
            pres = this._prev.seekTo(1,this._playDirection.FORWARD);
        }
        //Maintain the invariant. If we're seeking, all next nodes must have their state == 0.
        if(this._next && _direction != this._playDirection.FORWARD){
            nres = this._next.seekTo(0,this._playDirection.REVERSE);
        }
        //If we're at our destination, no need to set up the animation timer
        if(this.target == this.state){
            return 0;
        }
        //variants maintained, we're going to move somehow, so set our direction
        this._direction = _direction || 0;
        //something else is chaining. we've set the state for this animation, the chained timer will kick us off
        if(pres != 0 || nres != 0){ return -1; }
        this._setupAnimationTimer()
        return 1;
    },
    _setupAnimationTimer: function(){
        if (!this.intervalId){
            this.intervalId = window.setInterval(this.timerDelegate, this.options.interval);
        }
    },
    /** @id MochiKit.Animator.Animation.jumpTo */
    jumpTo: function(to){
        this._direction = 0;
        if(this._prev && this._prev.state != 1) this._prev.jumpTo(1)
        if(this._next && this._next.state != 0) this._next.jumpTo(0)
        this.target = this.state = Math.max(0, Math.min(1,to));
        this._onTimerEvent();
    },
    play: function() {
        //jump to the beginning
        var cur = this;
        while(cur._prev){ cur = cur._prev; }
        cur.jumpTo(0);

        //play to the end
        cur = this;
        while(cur._next){ cur = cur._next; }
        cur.seekFromTo(0, 1, this._playDirection.FORWARD)
    },
    reverse: function() {
        //jump to the end
        var cur = this;
        while(cur._next){ cur = cur._next; }
        cur.jumpTo(1);

        //play to the beginning
        cur = this;
        while(cur._prev){ cur = cur._prev; }
        cur.seekFromTo(1, 0, this._playDirection.REVERSE)

    },
    /** @id MochiKit.Animator.Animation.toggle */
    toggle: function(){
        var dir = (1 - this.target) - this.state;
        var cur = this;
        if(dir >= 0){
            //log('dir forward')
            while(cur._next){
                cur = cur._next;
            }
            cur.seekTo(1);
        }else{
            //log('dir reverse')
            while(cur._prev){
                cur = cur._prev;
            }
            cur.seekTo(0);
        }
    },
    _playDirection: {
        REVERSE: -1,
        NO_PROPAGATE: 0,
        FORWARD: 1
    },
    /** @id MochiKit.Animator.Animation.chain */
    chain: function(animation){
        var me = this;

        if(animation._prev){
            me._prev = animation._prev;
            me._prev._next = me;
        }
        animation._prev = me;
        me._next = animation;

        return this;
    },
    /** @id MochiKit.Animator.Animation.addSubject */
    addSubject: function(subject){
        this.subjects[this.subjects.length] = subject;
        return this;
    },
    /** @id MochiKit.Animator.Animation.removeSubject */
    removeSubject: function(subject){
        this.subjects = this.subjects.reject(function(item){return item == subject;});
    },
    /** @id MochiKit.Animator.Animation.clearSubjects */
    clearSubjects: function(){
        this.subjects = [];
    },
    /** @id MochiKit.Animator.Animation._propagate */
    _propagate: function(){
        var unclampedValue = this.options.transition(this.state);
        var value = Math.max(0, Math.min(1, unclampedValue));
        for(var i = 0; i < this.subjects.length; i++){
            if(this.subjects[i].setState){
                this.subjects[i].setState(value,unclampedValue,this.state);
            } else {
                this.subjects[i](value,unclampedValue,this.state);
            }
        }
    },
    _onTimerEvent: function(){
        var movement = (this.options.interval / this.options.duration) * (this.state < this.target ? 1 : -1);
        if (Math.abs(movement) >= Math.abs(this.state - this.target)){
            this.state = this.target;
        } else {
            this.state += movement;
        }
        this._propagate();
        this.options.onStep.call(this);
        if (this.target == this.state) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
            if(this.state == 1 && movement > 0 && this._direction > 0){
                this._direction = 0;
                this.options.onForward.call(this,this);
                if(this._next){
                    //log('propagate forward')
                    this._next._setupAnimationTimer();
                }
            }
            else if(this.state == 0 && movement < 0 && this._direction < 0 ){
                this._direction = 0;
                this.options.onBackward.call(this,this);
                if(this._prev){
                    //log('propagate reverse')
                    this._prev._setupAnimationTimer();
                }
            }
            //var logstr = '{this.state:'+this.state+' this.targ:'+this.target+' this._direction:'+this._direction+'}';
            //if(this._prev)
            //    logstr = '{state:'+this._prev.state+' targ:'+this._prev.target+' _direction:'+this._prev._direction+'}'+(movement > 0 ? '->': '<-')+logstr;
            //if(this._next)
            //    logstr = logstr+(movement > 0 ? '->': '<-')+'{state:'+this._next.state+' targ:'+this._next.target+' _direction:'+this._next._direction+'}';
            //log(logstr);
            this.options.onComplete.call(this,this);
        }
    }
};
/** @id MochiKit.Animator.Animation.apply */
MochiKit.Animator.Animation.apply = function(el, style, options) {
    /* for animator original compat */
    return MochiKit.Animator.cssAnimation(style,options,el);
}

/** @id MochiKit.Animator.makeEaseIn */
MochiKit.Animator.makeEaseIn = function(a){
    return function(state){
        return Math.pow(state, a * 2);
    }
};

/** @id MochiKit.Animator.makeEaseOut */
MochiKit.Animator.makeEaseOut = function(a){
    return function(state){
        return 1 - Math.pow(1 - state, a * 2);
    }
};

MochiKit.Animator.transitions = {
    //new equations
    pulse: function (pos) {
        return MochiKit.Animator.transitions.easeInOut(1 - Math.abs(0.5-pos) * 2);
    },
    //Equations from the original animator.js
    linear: function(x){return x;},
    easeIn: MochiKit.Animator.makeEaseIn(1.5),
    easeOut: MochiKit.Animator.makeEaseOut(1.5),
    makeEaseIn: MochiKit.Animator.makeEaseIn,
    makeEaseOut: MochiKit.Animator.makeEaseOut,
    //These equations are taken from scriptaculous
    //pulsate is scriptaculous' pulse renamed, a pulse happens once.
    pulsate: function(pos){
        return (Math.floor(pos*10) % 2 == 0 ?
            (pos*10 - Math.floor(pos*10)) : 1 - (pos*10 - Math.floor(pos*10)));
    },
    wobble: function (pos) {
        return (-Math.cos(pos*Math.PI*(9*pos))/2) + 0.5;
    },
    flicker: function (pos) {
        return ((-Math.cos(pos*Math.PI)/4) + 0.75) + Math.random()/4;
    },
    //These equations are courtesy Robert Penner
    quadIn: function(t){
        return t*t;
    },
    quadOut: function(t){
        return -t*(t-2);
    },
    quadInOut: function(t){
        if ((t*=2) < 1) return 0.5*t*t;
        return -0.5 * ((--t)*(t-2) - 1);
    },
    cubicIn: function(t){
        return t*t*t;
    },
    cubicOut: function(t){
        return ((t-1)*t*t + 1);
    },
    cubicInOut: function(t){
        if ((t*=2) < 1) return 0.5*t*t*t;
        return 0.5*((t-=2)*t*t + 2);
    },
    quartIn: function(t){
        return t*t*t*t;
    },
    quartOut: function(t){
        return -((t-1)*t*t*t-1);
    },
    quartInOut: function(t){
        if ((t*=2) < 1) return 0.5*t*t*t*t;
        return -0.5 * ((t-=2)*t*t*t - 2);
    },
    quintIn: function(t){
        return t*t*t*t*t;
    },
    quintOut: function(t){
        return ((t-1)*t*t*t*t + 1);
    },
    quintInOut: function(t){
        if ((t*=2) < 1) return 0.5*t*t*t*t*t;
        return 0.5*((t-=2)*t*t*t*t + 2);
    },
    sineIn: function(t){
        return - Math.cos(t/ (Math.PI/2)) + 1;
    },
    sineOut: function(t){
        return  Math.sin(t/ (Math.PI/2));
    },
    sineInOut: function(t){
        return -0.5 * (Math.cos(Math.PI*t) - 1);
    },
    expoIn: function(t){
        return (t==0) ? 0 :  Math.pow(2, 10 * (t - 1));
    },
    expoOut: function(t){
        return (t==1) ? 1 :  (-Math.pow(2, -10 * t) + 1);
    },
    expoInOut: function(t){
        if (t==0) return 0;
        if (t==1) return 1;
        if ((t*=2) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
        return 0.5 * (-Math.pow(2, -10 * --t) + 2);
    },
    circIn: function(t){
        return - (Math.sqrt(1 - t*t) - 1);
    },
    circOut: function(t){
        return  Math.sqrt(1 - (t-1)*t);
    },
    circInOut: function(t){
        if ((t*=2) < 1) return -0.5 * (Math.sqrt(1 - t*t) - 1);
        return 0.5 * (Math.sqrt(1 - (t-=2)*t) + 1);
    },
    elasticIn: function(t, a, p){
        if (t==0) return 0;  if (t==1) return 1;  if (!p) p=.3; if (!a) a = 1;
        if (a < Math.abs(1)){ a=1; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin(1/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*1-s)*(2*Math.PI)/p ));
    },
    elasticOut: function(t, a, p){
        if (t==0) return 0;  if (t==1) return 1;  if (!p) p=.3; if (!a) a = 1;
        if (a < Math.abs(1)){ a=1; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin(1/a);
        return a*Math.pow(2,-10*t) * Math.sin( (t*1-s)*(2*Math.PI)/p ) + 1;
    },
    elasticInOut: function(t, a, p){
        if (t==0) return 0;  if ((t*=2)==2) return 1;  if (!p) p=(.3*1.5); if (!a) a = 1;
        if (a < Math.abs(1)){ a=1; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin(1/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*1-s)*(2*Math.PI)/p ));
        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*1-s)*(2*Math.PI)/p )*.5 + 1;
    },
    backIn: function(t, s){
        if (!s) s = 1.70158;
        return t*t*((s+1)*t - s);
    },
    backOut: function(t, s){
        if (!s) s = 1.70158;
        return ((t-1)*t*((s+1)*t + s) + 1);
    },
    backInOut: function(t, s){
        if (!s) s = 1.70158;
        if ((t*=2) < 1) return 0.5*(t*t*(((s*=(1.525))+1)*t - s));
        return 0.5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
    },
    bounceIn: function(t){
        return 1 - MochiKit.Animator.transitions.bounceOut (1-t);
    },
    bounceOut: function(t){
        if (t < (1/2.75)){
            return (7.5625*t*t);
        } else if (t < (2/2.75)){
            return (7.5625*(t-=(1.5/2.75))*t + .75);
        } else if (t < (2.5/2.75)){
            return (7.5625*(t-=(2.25/2.75))*t + .9375);
        } else {
            return (7.5625*(t-=(2.625/2.75))*t + .984375);
        }
    },
    bounceInOut: function(t){
        if (t < 0.5) return MochiKit.Animator.transitions.bounceIn(t*2) * .5;
        return MochiKit.Animator.transitions.bounceOut(t*2-1) * .5 + .5;
    }
};
//easeInOut is hereby "whatever easeInOut I like for this release"
MochiKit.Animator.transitions.easeInOut= MochiKit.Animator.transitions.cubicInOut;

// Returns an array of tuples of type [from, to, [matchingElements]]
MochiKit.Animator._optimizeAnimation = function(els,property,fromList,toList){
    var B = MochiKit.Base;
    var animationMap = {}
    var isFromList = B.isArrayLike(fromList);
    var isToList = B.isArrayLike(toList);
    var from = fromList, to= toList;
    for(var i = 0; i <els.length; i++){
        if(isFromList) from = fromList[i];
        if(isToList) to = toList[i];
        if(!animationMap[from]) animationMap[from] = {};
        if(!animationMap[from][to]){
            animationMap[from][to] = [from,to,[els[i]]];
        }else{
            animationMap[from][to][2].push(els[i]);
        }
    }
    var toReturn = [];
    for(fromK in animationMap){
        for(toK in animationMap[fromK]){
            toReturn.push(animationMap[fromK][toK]);
        }
    }
    return toReturn;
}

MochiKit.Animator.AnimatedStyleNumeric = function(els, property, from, to, preferredUnits){
    this.__init__(els,property,from,to,preferredUnits);
}
MochiKit.Animator.AnimatedStyleNumeric.prototype = {
    __init__: function(els, property, from, to, preferredUnits){
        var B = MochiKit.Base, I = MochiKit.Iter, A = MochiKit.Animator;

        if(B.isCallable(els)){
            els = argument.call(this);
        }
        els = B.map(MochiKit.DOM.getElement, A._toArray(els));
        if(B.isEmpty(els))
            throw new Error("No elements passed! This Numeric effect needs something to Animate.");

        this.property = B.camelize(property);
        var processTo = A._processArgument(to,els,null,'to');
        var processFrom = A._processArgument(from,els,property,'from');
        var processUnits = A._processArgument(preferredUnits,els,null,'preferredUnits');

        //I optimize before parsing here but I think we're pretty unlikely
        // to have homonyms here and if we do, it'll probably error anyway,
        // plus the lists returned by parse don't work as "keys" in our hash,
        // so I'd have to convert them back and parse them again anyway.
        // I'm probably thinking about this more than I need to.
        var processList = A._optimizeAnimation(els, property, processFrom, processTo);
        var units = processUnits || 'px', isUnitsList = B.isArrayLike(processUnits);
        this.processList = new Array();
        for(var i = 0; i < processList.length; i++){
            if(isUnitsList) units = processUnits[i] || 'px';
            from = this._parseValue(processList[i][0],property,units);
            to = this._parseValue(processList[i][1],property,units);
            if(from[1] == to[1]){
                this.processList.push([from[0],to[0],from[1],processList[i][2]]);
            }else{
                this.processList.push([from[0],to[0],units,processList[i][2]]);
            }
        }
    },
    _parseValue: function(value,property,preferredUnits){
        if(typeof(value) == "number")
            return [value, preferredUnits]
        var floatParsed = parseFloat(value);
        var intParsed = parseInt(value);
        if(isNaN(floatParsed) && isNaN(intParsed))
            throw TypeError("Numeric animator was passed "+value+
                " for property "+property+", which isn't a number.");
        var units = /em|ex|px|in|cm|mm|pt|pc|%/.exec(value.toLowerCase());
        units = units? units[0]: preferredUnits;
        if(!isNaN(intParsed) && floatParsed == intParsed){
            return [intParsed,units];
        }else{
            return [floatParsed, units];
        }
    },
    _figureOutValue: function(from,to,preferred){
        var pfrom = this._parseValue(from,property,preferred);
        var pto = this._parseValue(to,property,preferred);
        if(pfrom[1] == pto[1]){
            return [pfrom[0],pto[0],pfrom[1]]
        }else{
            //this probably isn't a good idea but do some testing
            //before converting this case to an error
            return [pfrom[0],pto[0],preferred]
        }
    },
    setState: function(state,unclampedState,rawState){
        var els, from, to, units;
        var calcstate, style;
        if(this.transition){
            unclampedState = this.transition(rawState);
            state = Math.max(0,Math.min(1,unclampedState));
        }
        for(var i = 0; i < this.processList.length; i++){
            from = this.processList[i][0];
            to = this.processList[i][1];
            units = this.processList[i][2];
            els = this.processList[i][3];
            if(this.property == 'opacity'){
                style = from + ((to - from) * state);
            } else {
                calcstate = from + ((to - from) * unclampedState);
                style = Math.round(calcstate) + units;
            }
            for(var j = 0; j < els.length; j++){
                if(this.property == 'opacity'){
                    MochiKit.Style.setOpacity(els[j], style);
                }else{
                    els[j].style[this.property] = style;
                }
            }
        }
    }
};

/** @id MochiKit.Animator.AnimatedStyleColor */
MochiKit.Animator.AnimatedStyleColor = function(els, property, from, to){
    this.__init__(els, property, from, to);
};
MochiKit.Animator.AnimatedStyleColor.prototype = {
    __init__: function(els, property, from, to){
        var B = MochiKit.Base, I = MochiKit.Iter, A = MochiKit.Animator;

        if(B.isCallable(els)){
            els = argument.call(this);
        }
        els = B.map(MochiKit.DOM.getElement, A._toArray(els));
        if(B.isEmpty(els))
            throw new Error("No elements passed! This Numeric effect needs something to Animate.");

        this.property = B.camelize(property);
        var processTo = B.map(
                            function(c){ var C = MochiKit.Color.Color; return c instanceof C ? c : C.fromString(c)},
                            A._toArray(A._processArgument(to,els,null,'to')));
        var processFrom = B.map(
                            function(c){ var C = MochiKit.Color.Color; return c instanceof C ? c : C.fromString(c)},
                            A._toArray(A._processArgument(from,els,property,'from')));
        if(processFrom.length == 1) processFrom = processFrom[0];
        if(processTo.length == 1) processTo = processTo[0];

        this.processList = A._optimizeAnimation(els, property, processFrom, processTo);
    },
    setState: function(state,unclampedState,rawState){
        var els, from, to, units;
        var color;
        if(this.transition){
            unclampedState = this.transition(rawState);
            state = Math.max(0,Math.min(1,unclampedState));
        }
        for(var i = 0; i < this.processList.length; i++){
            from = this.processList[i][0];
            to = this.processList[i][1];
            els = this.processList[i][2];
            color = from.blendedColor(to,state).toHexString();
            for(var j = 0; j < els.length; j++){
                els[j].style[this.property] = color;
            }
        }
    }
};

MochiKit.Animator._toArray = function(maybeIterator){
    if(maybeIterator == null)
        return [null];
    if(MochiKit.Base.isArrayLike(maybeIterator))
        return maybeIterator;
    try{
        return MochiKit.Iter.list(MochiKit.Iter.iter(maybeIterator));
    }catch (e){
        if(!e instanceof TypeError) throw e;
        return [maybeIterator];
    }
};
MochiKit.Animator._getStylesFromElement = function(styles,e){
    var B = MochiKit.Base;
    var ret = {};
    MochiKit.Iter.forEach(styles,function(k){
        ret[k] = MochiKit.Style.getStyle(e,k);
    });
    return ret;
};
MochiKit.Animator._processArgument = function(argument, els, property, argumentName){
    var toArray = MochiKit.Animator._toArray;
    if(MochiKit.Base.isCallable(argument)){
        argument = toArray(argument.call(this,els));
    }else{
        argument = toArray(argument);
    }
    if(property != null){
        var argList = argument.length != 1;
        var arg = argument[0];
        if(argList || arg == null){
            if(arg == null) argument = new Array(els.length);
            for(var i = 0; i < els.length; i++){
                if(argument[i] == null) {
                    //this is, on occasion, null in IE. I expect it not to be, hence the 0.
                    // seems to only apply to numeric values.
                    argument[i] = MochiKit.Style.getStyle(els[i],property) || '0';
                    //alert(property+" "+repr(els[i].outerHTML)+argumentName+" "+repr(els[i].currentStyle)+" "+MochiKit.Style.getStyle(els[i],property));
                }
            }
        }
    }
    if(argument.length == 1){
        return argument[0];
    }else if(argument.length == els.length){
        return argument;
    }else{
        throw new Error((argumentName || '') + " Argument and Element list are not the same length");
    }
};

MochiKit.Animator._createEffect = function(els,prop,fromStyle,toStyle,units){
        var to, fromList, toList, unitsList, match, type;
        var A = MochiKit.Animator;
        var numericalRe = /^[0-9.-]+(%|em|ex|px|in|cm|mm|pt|pc)?$/i;

        if(!prop) return;

        fromList = A._processArgument(fromStyle, els, prop,'fromStyle');
        toList = A._processArgument(toStyle, els, null,'toStyle');
        unitsList = A._processArgument(units, els, null,'units');

        to = MochiKit.Base.isArrayLike(toList) ?  toList[0] : toList;
        from = MochiKit.Base.isArrayLike(fromList) ?  fromList[0] : fromList;

        //if(!toStyle) {
        //    if(typeof(MochiKit.Logging) != 'undefined'){
        //        MochiKit.Logging.logError("No toStyle provided for '" + prop + '"');
        //    }
        //}
        if(to instanceof MochiKit.Color.Color || typeof(to) == "string" && MochiKit.Color.Color.fromString(to)){
            //from = fromStyle != null ? MochiKit.Color.Color.fromString(fromStyle) : null;
            type = MochiKit.Animator.AnimatedStyleColor;
            unitsList = null;
        } else if(match = numericalRe.exec(to)){
            type = MochiKit.Animator.AnimatedStyleNumeric;
            var frommatch = numericalRe.exec(from);
            frommatch = frommatch? frommatch[1] : null;
            unitsList = unitsList || match[1] || frommatch;
        } else {
            throw new TypeError("Unrecognised format for value of " +
                                  prop + ": '" + to + "'");
        }
        return new type(els, prop, fromList, toList, units);
};

MochiKit.Animator.AnimatedProperties = function(els, propertyObj){
    this.__init__(els, propertyObj);
};

MochiKit.Animator.AnimatedProperties.prototype = {
    __init__: function(els, propertyObj){
        var B = MochiKit.Base, I = MochiKit.Iter, A = MochiKit.Animator;
        if(B.isCallable(els)){
            els = argument.call(this);
        }
        if(B.isCallable(propertyObj)){
            propertyObj = propertyObj.call(this,els);
        }
        els = B.map(MochiKit.DOM.getElement, A._toArray(els));
        this.subjects = B.map( function(key_value){
            return A._createEffect.apply(this,B.extend([els, key_value[0]], key_value[1]));
            },B.items(propertyObj));
        if(I.some(this.subjects,B.operator.lognot))
            throw new Error("Invalid propertyObj"); //TODO: Better error reporting
    },
    setState: function(state,unclampedState,rawState) {
        if(this.transition){
            unclampedState = this.transition(rawState);
            state = Math.max(0,Math.min(1,unclampedState));
        }
        for(var i = 0; i < this.subjects.length; i++){
            this.subjects[i].setState(state,unclampedState,rawState);
        }
    }
};

MochiKit.Animator.AnimatedCSS = function(els, style1, style2){
    this.__init__(els, style1, style2);
};
MochiKit.Animator.AnimatedCSS.prototype = {
    __init__: function(els, style1, style2){
        var B = MochiKit.Base, I = MochiKit.Iter, A = MochiKit.Animator;

        if(B.isCallable(els)){
            els = argument.call(this);
        }
        els = B.map(MochiKit.DOM.getElement, A._toArray(els));
        //no sense in doing a lot of work if there's nothing to process
        if(B.isEmpty(els)) return; 

        var toStyle, fromStyle;
        if(style2){
            fromStyle = this.parseStyle(style1);
            toStyle = this.parseStyle(style2);
        } else {
            toStyle = this.parseStyle(style1);
            fromStyle = {};
            I.forEach(B.keys(toStyle),
                function(key){ fromStyle[key] = null; });
        }
        this.subjects = B.map(
                function(prop){return A._createEffect(els,prop,fromStyle[prop],toStyle[prop])},
                B.keys(toStyle));
    },
    parseStyle: function(style){
        var styles = style.split(';');
        var rtn = {};
        var ruleRe = /^\s*([a-zA-Z\-]+)\s*:\s*(\S(.+\S)?)\s*$/;
        for (var i=0; i<styles.length; i++) {
            var parts = ruleRe.exec(styles[i]);
            if (parts) {
                rtn[parts[1]] = parts[2];
            }
        }
        return rtn;
    },
    setState: function(state,unclampedState,rawState) {
        if(this.transition){
            unclampedState = this.transition(rawState);
            state = Math.max(0,Math.min(1,unclampedState));
        }
        for(var i = 0; i < this.subjects.length; i++){
            this.subjects[i].setState(state,unclampedState,rawState);
        }
    }
};

/** @id MochiKit.Animator.cssAnimation */
MochiKit.Animator._cssFactory = function(animation, style/* [options], el/* ... */) {
    var expectedArgsLength = 4;
    var options = arguments[2];
    var el;
    if(options != null && !(typeof(options.length) == "undefined" && typeof(options.nodeType) == 'undefined')){
        expectedArgsLength = expectedArgsLength - 1;
        options = null;
    }
    el = MochiKit.Base.extend(null,arguments,expectedArgsLength-1)
    el = MochiKit.Base.flattenArguments(el);
    if(el.length == 0)
        throw new TypeError("MochiKit.Animator.css"+(animation ? "Animation":"Effect")+" is missing an element to animate.");
    if (MochiKit.Base.isArrayLike(style)) {
        if(style.length > 1){
            if(animation){
                return new MochiKit.Animator.Animation(options).addSubject(new MochiKit.Animator.AnimatedCSS(el, style[0], style[1]));
            }else{
                return new MochiKit.Animator.AnimatedCSS(el, style[0], style[1]);
            }
        } else{
            if(animation){
                return new MochiKit.Animator.Animation(options).addSubject(new MochiKit.Animator.AnimatedCSS(el, style[0]));
            }else{
                return new MochiKit.Animator.AnimatedCSS(el, style[0]);
            }
        }
    } else if(typeof(style) == "string"){
        if(animation){
        return new MochiKit.Animator.Animation(options).addSubject(new MochiKit.Animator.AnimatedCSS(el, style));
        }else{
        return new MochiKit.Animator.AnimatedCSS(el, style);
        }
    } else if(style != null){ //must be an object
        if(animation){
            return new MochiKit.Animator.Animation(options).addSubject(new MochiKit.Animator.AnimatedProperties(el, style));
        }else{
            return new MochiKit.Animator.AnimatedProperties(el, style);
        }
    }
};

/** @id MochiKit.Animator.cssAnimation */
MochiKit.Animator.cssAnimation = function(style/*, [options], el ... */){
    return MochiKit.Animator._cssFactory.apply(this,MochiKit.Base.extend([true],arguments));
};
/** @id MochiKit.Animator.cssEffect */
MochiKit.Animator.cssEffect = function(style/*, [options], el ... */){
    return MochiKit.Animator._cssFactory.apply(this,MochiKit.Base.extend([false],arguments));
};

/** @id MochiKit.Animator.valueAnimation */
MochiKit.Animator.valueAnimation = function(fn, /* optional */ options){
    return new MochiKit.Animator.Animation(options).addSubject(fn||MochiKit.Base.operator.identity);
}

MochiKit.Animator.pauseAnimation = function(duration, /* optional */ options){
    var opts = MochiKit.Base.update({interval: Math.min(500,duration/3)},options);
    opts.duration = duration;
    return new MochiKit.Animator.Animation(opts);
}

MochiKit.Animator.chainAnimations = function(/*iterable ...*/){
    var B = MochiKit.Base, I = MochiKit.Iter, A = MochiKit.Animator;
    var iterable = B.flattenArguments(arguments);
    return I.reduce(function(chained,start){ start.chain(chained); return start; },
                  I.reversed(iterable));
}

MochiKit.Animator.__new__ = function(){
    MochiKit.Base.nameFunctions(this);
    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": MochiKit.Base.concat(this.EXPORT, this.EXPORT_OK)
    }
};


MochiKit.Animator.EXPORT = [
    "Animation",
    "transitions",
    "AnimatedStyleNumeric",
    "AnimatedStyleColor",
    "AnimatedCSS",
    "AnimatedProperties",
    "cssAnimation",
    "cssEffect",
    "pauseAnimation",
    "valueAnimation",
    "chainAnimations"
];
MochiKit.Animator.EXPORT_OK = [
];

MochiKit.Animator.__new__();
MochiKit.Base._exportSymbols(this, MochiKit.Animator);

/* To get original animator to run unchanged

    var Animator = MochiKit.Animator.Animation;
    Animator.tx = MochiKit.Animator.transitions;
    Animator.makeEaseIn = Animator.tx.makeEaseIn;
    Animator.makeEaseOut = Animator.tx.makeEaseOut;
    var ColorStyleSubject = MochiKit.Animator.AnimatedStyleColor;
    var NumericalStyleSubject = MochiKit.Animator.AnimatedStyleNumeric;
    var CSSStyleSubject = MochiKit.Animator.AnimatedCSS;

*/
