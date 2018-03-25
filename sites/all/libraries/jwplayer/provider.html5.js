/*!
JW Player version 8.2.0
Copyright (c) 2018, JW Player, All Rights Reserved 
https://github.com/jwplayer/jwplayer/blob/v8.2.0/README.md

This source code and its use and distribution is subject to the terms and conditions of the applicable license agreement. 
https://www.jwplayer.com/tos/

This product includes portions of other software. For the full text of licenses, see below:

JW Player Third Party Software Notices and/or Additional Terms and Conditions

**************************************************************************************************
The following software is used under Apache License 2.0
**************************************************************************************************

vtt.js v0.13.0
Copyright (c) 2018 Mozilla (http://mozilla.org)
https://github.com/mozilla/vtt.js/blob/v0.13.0/LICENSE

* * *

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and
limitations under the License.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**************************************************************************************************
The following software is used under MIT license
**************************************************************************************************

Underscore.js v1.6.0
Copyright (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative
https://github.com/jashkenas/underscore/blob/1.6.0/LICENSE

Backbone backbone.events.js v1.1.2
Copyright (c) 2010-2014 Jeremy Ashkenas, DocumentCloud
https://github.com/jashkenas/backbone/blob/1.1.2/LICENSE

Promise Polyfill v7.1.0
Copyright (c) 2014 Taylor Hakes and Forbes Lindesay
https://github.com/taylorhakes/promise-polyfill/blob/v7.1.0/LICENSE

can-autoplay.js v3.0.0
Copyright (c) 2017 video-dev
https://github.com/video-dev/can-autoplay/blob/v3.0.0/LICENSE

* * *

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**************************************************************************************************
The following software is used under W3C license
**************************************************************************************************

Intersection Observer v0.5.0
Copyright (c) 2016 Google Inc. (http://google.com)
https://github.com/w3c/IntersectionObserver/blob/v0.5.0/LICENSE.md

* * *

W3C SOFTWARE AND DOCUMENT NOTICE AND LICENSE
Status: This license takes effect 13 May, 2015.

This work is being provided by the copyright holders under the following license.

License
By obtaining and/or copying this work, you (the licensee) agree that you have read, understood, and will comply with the following terms and conditions.

Permission to copy, modify, and distribute this work, with or without modification, for any purpose and without fee or royalty is hereby granted, provided that you include the following on ALL copies of the work or portions thereof, including modifications:

The full text of this NOTICE in a location viewable to users of the redistributed or derivative work.

Any pre-existing intellectual property disclaimers, notices, or terms and conditions. If none exist, the W3C Software and Document Short Notice should be included.

Notice of any changes or modifications, through a copyright statement on the new code or document such as "This software or document includes material copied from or derived from [title and URI of the W3C document]. Copyright © [YEAR] W3C® (MIT, ERCIM, Keio, Beihang)."

Disclaimers
THIS WORK IS PROVIDED "AS IS," AND COPYRIGHT HOLDERS MAKE NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO, WARRANTIES OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF THE SOFTWARE OR DOCUMENT WILL NOT INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.

COPYRIGHT HOLDERS WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, SPECIAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF ANY USE OF THE SOFTWARE OR DOCUMENT.

The name and trademarks of copyright holders may NOT be used in advertising or publicity pertaining to the work without specific, written prior permission. Title to copyright in this work will at all times remain with copyright holders.
*/
webpackJsonpjwplayer([6],{176:function(e,t,i){"use strict";function n(e){return e&&e.length?e.end(e.length-1):0}Object.defineProperty(t,"__esModule",{value:!0}),t.default=n},177:function(e,t,i){"use strict";function n(e){return{bitrate:e.bitrate,label:e.label,width:e.width,height:e.height}}Object.defineProperty(t,"__esModule",{value:!0}),t.qualityLevel=n},178:function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=i(5),r=i(6),a=function(e){return e&&e.__esModule?e:{default:e}}(r),s={canplay:function(){this.trigger(n.MEDIA_BUFFER_FULL)},play:function(){this.stallTime=-1,this.video.paused||this.state===n.STATE_PLAYING||this.setState(n.STATE_LOADING)},loadedmetadata:function(){var e={duration:this.getDuration(),height:this.video.videoHeight,width:this.video.videoWidth},t=this.drmUsed;t&&(e.drm=t),this.trigger(n.MEDIA_META,e)},timeupdate:function(){var e=this.video.videoHeight;e!==this._helperLastVideoHeight&&this.adaptation&&this.adaptation({size:{width:this.video.videoWidth,height:e}}),this._helperLastVideoHeight=e;var t=this.getCurrentTime(),i=this.getDuration();if(!isNaN(i)){this.seeking||this.video.paused||this.state!==n.STATE_STALLED&&this.state!==n.STATE_LOADING||this.stallTime===this.getCurrentTime()||(this.stallTime=-1,this.setState(n.STATE_PLAYING));var r={position:t,duration:i,currentTime:this.video.currentTime,metadata:{currentTime:this.video.currentTime}};if(this.getPtsOffset){var a=this.getPtsOffset();a>=0&&(r.metadata.mpegts=a+t)}(this.state===n.STATE_PLAYING||this.seeking)&&this.trigger(n.MEDIA_TIME,r)}},click:function(e){this.trigger(n.CLICK,e)},volumechange:function(){var e=this.video;this.trigger(n.MEDIA_VOLUME,{volume:Math.round(100*e.volume)}),this.trigger(n.MEDIA_MUTE,{mute:e.muted})},seeked:function(){this.seeking&&(this.seeking=!1,this.trigger(n.MEDIA_SEEKED))},playing:function(){-1===this.stallTime&&this.setState(n.STATE_PLAYING),this.trigger(n.PROVIDER_FIRST_FRAME)},pause:function(){this.state!==n.STATE_COMPLETE&&(this.video.ended||this.video.error||this.video.currentTime!==this.video.duration&&this.setState(n.STATE_PAUSED))},progress:function(){var e=this.getDuration();if(!(e<=0||e===1/0)){var t=this.video.buffered;if(t&&0!==t.length){var i=a.default.between(t.end(t.length-1)/e,0,1);this.trigger(n.MEDIA_BUFFER,{bufferPercent:100*i,position:this.getCurrentTime(),duration:e})}}},ratechange:function(){this.trigger(n.MEDIA_RATE_CHANGE,{playbackRate:this.video.playbackRate})},ended:function(){this._helperLastVideoHeight=0,this.state!==n.STATE_IDLE&&this.state!==n.STATE_COMPLETE&&this.trigger(n.MEDIA_COMPLETE)},loadeddata:function(){this.renderNatively&&this.setTextTracks(this.video.textTracks)},error:function(){var e=this.video.error&&this.video.error.code||-1,t={1:"Unknown operation aborted",2:"Unknown network error",3:"Unknown decode error",4:"File could not be played"}[e]||"Unknown";this.trigger(n.MEDIA_ERROR,{code:e,message:"Error loading media: "+t})}};t.default=s},179:function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=i(24),r=i(176),a=function(e){return e&&e.__esModule?e:{default:e}}(r),s={container:null,volume:function(e){e=Math.max(Math.min(e/100,1),0),this.video.volume=e},mute:function(e){this.video.muted=!!e,this.video.muted||this.video.removeAttribute("muted")},resize:function(e,t,i){if(!(e&&t&&this.video.videoWidth&&this.video.videoHeight))return!1;if("uniform"===i){var r=e/t,a=this.video.videoWidth/this.video.videoHeight,s=null;Math.abs(r-a)<.09&&(s="fill"),(0,n.style)(this.video,{objectFit:s,width:null,height:null})}return!1},getContainer:function(){return this.container},setContainer:function(e){this.container=e,this.video.parentNode!==e&&e.appendChild(this.video)},remove:function(){this.stop(),this.destroy();var e=this.container;e&&e===this.video.parentNode&&e.removeChild(this.video)},atEdgeOfLiveStream:function(){if(!this.isLive())return!1;return(0,a.default)(this.video.buffered)-this.video.currentTime<=2}};t.default=s},180:function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n={attachMedia:function(){this.eventsOn_()},detachMedia:function(){return this.eventsOff_(),this.video}};t.default=n},181:function(e,t,i){"use strict";function n(e){if(this._currentTextTrackIndex=-1,e){if(this._textTracks?(this._unknownCount=0,this._textTracks=D.default.reject(this._textTracks,function(e){var t=e._id;if(this.renderNatively&&t&&0===t.indexOf("nativecaptions"))return delete this._tracksById[t],!0;e.name&&0===e.name.indexOf("Unknown")&&this._unknownCount++},this),delete this._tracksById.nativemetadata):this._initTextTracks(),e.length){var t=0,i=e.length;for(t;t<i;t++){var n=e[t];if(!n._id){if("captions"===n.kind||"metadata"===n.kind){if(n._id="native"+n.kind+t,!n.label&&"captions"===n.kind){var r=(0,A.createLabel)(n,this._unknownCount);n.name=r.label,this._unknownCount=r.unknownCount}}else n._id=(0,A.createId)(n,this._textTracks.length);if(this._tracksById[n._id])continue;n.inuse=!0}if(n.inuse&&!this._tracksById[n._id])if("metadata"===n.kind)n.mode="hidden",n.oncuechange=I.bind(this),this._tracksById[n._id]=n;else if(y(n.kind)){var a,s=n.mode;if(n.mode="hidden",!n.cues.length&&n.embedded)continue;if(n.mode=s,this._cuesByTrackId[n._id]&&!this._cuesByTrackId[n._id].loaded){for(var u=this._cuesByTrackId[n._id].cues;a=u.shift();)b(this.renderNatively,n,a);n.mode=s,this._cuesByTrackId[n._id].loaded=!0}w.call(this,n)}}}this.renderNatively&&(this.textTrackChangeHandler=this.textTrackChangeHandler||g.bind(this),this.addTracksListener(this.video.textTracks,"change",this.textTrackChangeHandler),(S.Browser.edge||S.Browser.firefox||S.Browser.safari)&&(this.addTrackHandler=this.addTrackHandler||k.bind(this),this.addTracksListener(this.video.textTracks,"addtrack",this.addTrackHandler))),this._textTracks.length&&this.trigger("subtitlesTracks",{tracks:this._textTracks})}}function r(e){if(this.renderNatively){var t=e===this._itemTracks;t||(0,B.cancelXhr)(this._itemTracks),this._itemTracks=e,e&&(t||(this.disableTextTrack(),C.call(this),this.addTextTracks(e)))}}function a(){return this._currentTextTrackIndex}function s(e){if(!this.renderNatively)return void(this.setCurrentSubtitleTrack&&this.setCurrentSubtitleTrack(e-1));this._textTracks&&(0===e&&D.default.each(this._textTracks,function(e){e.mode=e.embedded?"hidden":"disabled"}),this._currentTextTrackIndex!==e-1&&(this.disableTextTrack(),this._currentTextTrackIndex=e-1,this._textTracks[this._currentTextTrackIndex]&&(this._textTracks[this._currentTextTrackIndex].mode="showing"),this.trigger("subtitlesTrackChanged",{currentTrack:this._currentTextTrackIndex+1,tracks:this._textTracks})))}function u(e){if(e.text&&e.begin&&e.end){var t=e.trackid.toString(),i=this._tracksById&&this._tracksById[t];i||(i={kind:"captions",_id:t,data:[]},this.addTextTracks([i]),this.trigger("subtitlesTracks",{tracks:this._textTracks}));var n;e.useDTS&&(i.source||(i.source=e.source||"mpegts")),n=e.begin+"_"+e.text;var r=this._metaCuesByTextTime[n];if(!r){r={begin:e.begin,end:e.end,text:e.text},this._metaCuesByTextTime[n]=r;var a=(0,B.convertToVTTCues)([r])[0];i.data.push(a)}}}function o(e){this._tracksById||this._initTextTracks();var t=e.track?e.track:"native"+e.type,i=this._tracksById[t],n="captions"===e.type?"Unknown CC":"ID3 Metadata",r=e.cue;if(!i){var a={kind:e.type,_id:t,label:n,embedded:!0};i=E.call(this,a),this.renderNatively||"metadata"===i.kind?this.setTextTracks(this.video.textTracks):m.call(this,[i])}L.call(this,i,r)&&(this.renderNatively||"metadata"===i.kind?b(this.renderNatively,i,r):i.data.push(r))}function d(e){var t=this._tracksById[e.name];if(t){t.source=e.source;for(var i=e.captions||[],n=[],r=!1,a=0;a<i.length;a++){var s=i[a],u=e.name+"_"+s.begin+"_"+s.end;this._metaCuesByTextTime[u]||(this._metaCuesByTextTime[u]=s,n.push(s),r=!0)}r&&n.sort(function(e,t){return e.begin-t.begin});var o=(0,B.convertToVTTCues)(n);Array.prototype.push.apply(t.data,o)}}function c(e,t,i){e&&(l(e,t,i),this.instreamMode||(e.addEventListener?e.addEventListener(t,i):e["on"+t]=i))}function l(e,t,i){e&&(e.removeEventListener?e.removeEventListener(t,i):e["on"+t]=null)}function h(){(0,B.cancelXhr)(this._itemTracks);var e=this._tracksById&&this._tracksById.nativemetadata;(this.renderNatively||e)&&(p(this.renderNatively,this.video.textTracks),e&&(e.oncuechange=null)),this._itemTracks=null,this._textTracks=null,this._tracksById=null,this._cuesByTrackId=null,this._metaCuesByTextTime=null,this._unknownCount=0,this._currentTextTrackIndex=-1,this._activeCuePosition=null,this.renderNatively&&(this.removeTracksListener(this.video.textTracks,"change",this.textTrackChangeHandler),p(this.renderNatively,this.video.textTracks))}function f(e){var t=this._cachedVTTCues;t&&t[e]&&(t[e]={},this._tracksById&&(this._tracksById[e].data=[]))}function v(){if(this._textTracks){var e=this._textTracks[this._currentTextTrackIndex];if(e){e.mode="disabled";var t=e._id;t&&0===t.indexOf("nativecaptions")&&(e.mode="hidden")}}}function T(){if(this._textTracks){var e=this._textTracks[this._currentTextTrackIndex];e&&(e.mode="showing")}}function g(){var e=this.video.textTracks,t=D.default.filter(e,function(e){return(e.inuse||!e._id)&&y(e.kind)});if(!this._textTracks||M.call(this,t))return void this.setTextTracks(e);for(var i=-1,n=0;n<this._textTracks.length;n++)if("showing"===this._textTracks[n].mode){i=n;break}i!==this._currentTextTrackIndex&&this.setSubtitlesTrack(i+1)}function k(){this.setTextTracks(this.video.textTracks)}function m(e){var t=this;e&&(this._textTracks||this._initTextTracks(),e.forEach(function(e){if(!e.kind||y(e.kind)){var i=E.call(t,e);w.call(t,i),e.file&&(e.data=[],(0,B.loadFile)(e,function(e){t.addVTTCuesToTrack(i,e)},function(e){t.trigger(P.ERROR,{message:"Captions failed to load",reason:e})}))}}),this._textTracks&&this._textTracks.length&&this.trigger("subtitlesTracks",{tracks:this._textTracks}))}function _(e,t){if(this.renderNatively){var i=this._tracksById[e._id];if(!i)return this._cuesByTrackId||(this._cuesByTrackId={}),void(this._cuesByTrackId[e._id]={cues:t,loaded:!1});if(!this._cuesByTrackId[e._id]||!this._cuesByTrackId[e._id].loaded){var n;for(this._cuesByTrackId[e._id]={cues:t,loaded:!0};n=t.shift();)b(this.renderNatively,i,n)}}}function b(e,t,i){if(!S.Browser.ie||!e||!window.TextTrackCue)return void t.addCue(i);var n=new window.TextTrackCue(i.startTime,i.endTime,i.text);t.addCue(n)}function p(e,t){t&&t.length&&D.default.each(t,function(t){if(!(S.Browser.ie&&e&&/^(native|subtitle|cc)/.test(t._id))){t.mode="disabled",t.mode="hidden";for(var i=t.cues.length;i--;)t.removeCue(t.cues[i]);t.embedded||(t.mode="disabled"),t.inuse=!1}})}function y(e){return"subtitles"===e||"captions"===e}function x(){this._textTracks=[],this._tracksById={},this._metaCuesByTextTime={},this._cuesByTrackId={},this._cachedVTTCues={},this._unknownCount=0}function E(e){var t,i=(0,A.createLabel)(e,this._unknownCount),n=i.label;if(this._unknownCount=i.unknownCount,this.renderNatively||"metadata"===e.kind){var r=this.video.textTracks;t=D.default.findWhere(r,{label:n}),t||(t=this.video.addTextTrack(e.kind,n,e.language||"")),t.default=e.default,t.mode="disabled",t.inuse=!0}else t=e,t.data=t.data||[];return t._id||(t._id=(0,A.createId)(e,this._textTracks.length)),t}function w(e){this._textTracks.push(e),this._tracksById[e._id]=e}function C(){if(this._textTracks){var e=D.default.filter(this._textTracks,function(e){return e.embedded||"subs"===e.groupid});this._initTextTracks(),D.default.each(e,function(e){this._tracksById[e._id]=e}),this._textTracks=e}}function I(e){var t=e.currentTarget.activeCues;if(t&&t.length){var i=t[t.length-1].startTime;if(this._activeCuePosition!==i){var n=[];if(D.default.each(t,function(e){e.startTime<i||(e.data||e.value?n.push(e):e.text&&this.trigger("meta",{metadataTime:i,metadata:JSON.parse(e.text)}))},this),n.length){var r=(0,O.parseID3)(n);this.trigger("meta",{metadataTime:i,metadata:r})}this._activeCuePosition=i}}}function L(e,t){var i=e.kind;this._cachedVTTCues[e._id]||(this._cachedVTTCues[e._id]={});var n,r=this._cachedVTTCues[e._id];switch(i){case"captions":case"subtitles":n=Math.floor(20*t.startTime);var a="_"+t.line,s=Math.floor(20*t.endTime),u=r[n+a]||r[n+1+a]||r[n-1+a];return!(u&&Math.abs(u-s)<=1)&&(r[n+a]=s,!0);case"metadata":var o=t.data?new Uint8Array(t.data).join(""):t.text;return n=t.startTime+o,r[n]?!1:(r[n]=t.endTime,!0);default:return!1}}function M(e){if(e.length>this._textTracks.length)return!0;for(var t=0;t<e.length;t++){var i=e[t];if(!i._id||!this._tracksById[i._id])return!0}return!1}Object.defineProperty(t,"__esModule",{value:!0});var B=i(93),A=i(94),O=i(182),S=i(11),P=i(5),N=i(0),D=function(e){return e&&e.__esModule?e:{default:e}}(N),j={_itemTracks:null,_textTracks:null,_tracksById:null,_cuesByTrackId:null,_cachedVTTCues:null,_metaCuesByTextTime:null,_currentTextTrackIndex:-1,_unknownCount:0,_activeCuePosition:null,_initTextTracks:x,addTracksListener:c,clearTracks:h,clearCueData:f,disableTextTrack:v,enableTextTrack:T,getSubtitlesTrack:a,removeTracksListener:l,addTextTracks:m,setTextTracks:n,setupSideloadedTracks:r,setSubtitlesTrack:s,textTrackChangeHandler:null,addTrackHandler:null,addCuesToTrack:d,addCaptionsCue:u,addVTTCue:o,addVTTCuesToTrack:_,renderNatively:!1};t.default=j},182:function(e,t,i){"use strict";function n(e,t){for(var i=e.length,n=void 0,r=void 0,a=void 0,s="",u=t||0;u<i;)if(0!==(n=e[u++])&&3!==n)switch(n>>4){case 0:case 1:case 2:case 3:case 4:case 5:case 6:case 7:s+=String.fromCharCode(n);break;case 12:case 13:r=e[u++],s+=String.fromCharCode((31&n)<<6|63&r);break;case 14:r=e[u++],a=e[u++],s+=String.fromCharCode((15&n)<<12|(63&r)<<6|(63&a)<<0)}return s}function r(e,t){for(var i=e.length-1,n="",r=t||0;r<i;)254===e[r]&&255===e[r+1]||(n+=String.fromCharCode((e[r]<<8)+e[r+1])),r+=2;return n}function a(e){var t=s(e);return 127&t|(32512&t)>>1|(8323072&t)>>2|(2130706432&t)>>3}function s(e){for(var t="0x",i=0;i<e.length;i++)e[i]<16&&(t+="0"),t+=e[i].toString(16);return parseInt(t)}function u(){return(arguments.length>0&&void 0!==arguments[0]?arguments[0]:[]).reduce(function(e,t){if(!("value"in t)&&"data"in t&&t.data instanceof ArrayBuffer){var i=t,s=new Uint8Array(i.data),u=s.length;t={value:{key:"",data:""}};for(var d=10;d<14&&d<s.length&&0!==s[d];)t.value.key+=String.fromCharCode(s[d]),d++;var c=19,l=s[c];3!==l&&0!==l||(l=s[++c],u--);var h=0;if(1!==l&&2!==l)for(var f=c+1;f<u;f++)if(0===s[f]){h=f-c;break}if(h>0){var v=n(s.subarray(c,c+=h),0);if("PRIV"===t.value.key){if("com.apple.streaming.transportStreamTimestamp"===v){var T=1&a(s.subarray(c,c+=4)),g=a(s.subarray(c,c+=4))+(T?4294967296:0);t.value.data=g}else t.value.data=n(s,c+1);t.value.info=v}else t.value.info=v,t.value.data=n(s,c+1)}else{var k=s[c];t.value.data=1===k||2===k?r(s,c+1):n(s,c+1)}}if(o.hasOwnProperty(t.value.key)&&(e[o[t.value.key]]=t.value.data),t.value.info){var m=e[t.value.key];m!==Object(m)&&(m={},e[t.value.key]=m),m[t.value.info]=t.value.data}else e[t.value.key]=t.value.data;return e},{})}Object.defineProperty(t,"__esModule",{value:!0}),t.utf8ArrayToStr=n,t.syncSafeInt=a,t.parseID3=u;var o={TIT2:"title",TT2:"title",WXXX:"url",TPE1:"artist",TP1:"artist",TALB:"album",TAL:"album"}},77:function(e,t,i){"use strict";function n(e){var t=[];e=(0,a.trim)(e);var i=e.split("\r\n\r\n");1===i.length&&(i=e.split("\n\n"));for(var n=0;n<i.length;n++)if("WEBVTT"!==i[n]){var s=r(i[n]);s.text&&t.push(s)}return t}function r(e){var t={},i=e.split("\r\n");1===i.length&&(i=e.split("\n"));var n=1;if(i[0].indexOf(" --\x3e ")>0&&(n=0),i.length>n+1&&i[n+1]){var r=i[n],s=r.indexOf(" --\x3e ");s>0&&(t.begin=(0,a.seconds)(r.substr(0,s)),t.end=(0,a.seconds)(r.substr(s+5)),t.text=i.slice(n+1).join("\r\n"))}return t}Object.defineProperty(t,"__esModule",{value:!0}),t.default=n;var a=i(1)},8:function(e,t,i){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function r(e,t){Object.keys(e).forEach(function(i){t.removeEventListener(i,e[i]),t.addEventListener(i,e[i])})}function a(e,t){Object.keys(e).forEach(function(i){t.removeEventListener(i,e[i])})}function s(e,t,i){function n(){var e=K.level;if(e.width!==q.videoWidth||e.height!==q.videoHeight){if(e.width=q.videoWidth,e.height=q.videoHeight,W(),!e.width||!e.height||-1===ne)return;K.reason=K.reason||"auto",K.mode="hls"===ie[ne].type?"auto":"manual",K.bitrate=0,e.index=ne,e.label=ie[ne].label,z.trigger(l.MEDIA_VISUAL_QUALITY,K),K.reason=""}}function s(e){te=h(e)}function h(e){return z.getDuration()<0&&(e-=O()),e}function v(e){Z&&-1!==Z&&e&&e!==1/0&&z.seek(Z)}function g(e){var t;return"array"===b.default.typeOf(e)&&e.length>0&&(t=x.default.map(e,function(e,t){return{label:e.label||t}})),t}function _(e){ie=e,ne=y(e)}function y(e){var i=Math.max(0,ne),n=t.qualityLabel;if(e)for(var r=0;r<e.length;r++)if(e[r].default&&(i=r),n&&e[r].label===n)return r;return K.reason="initial choice",K.level.width&&K.level.height||(K.level={}),i}function E(){return q.play()||(0,S.default)(q)}function w(e){Z=0,Y();var t=q.src,i=document.createElement("source");i.src=ie[ne].file,i.src!==t?(C(ie[ne]),t&&q.load()):0===e&&q.currentTime>0&&(Z=-1,z.seek(e)),e>0&&z.seek(e);var n=g(ie);n&&z.trigger(l.MEDIA_LEVELS,{levels:n,currentQuality:ne}),ie.length&&"hls"!==ie[0].type&&z.sendMediaType(ie)}function C(e){se=null,ue=-1,K.reason||(K.reason="initial choice",K.level={}),$=!1;var t=document.createElement("source");t.src=e.file,q.src!==t.src&&(q.src=e.file)}function L(){q&&(z.disableTextTrack(),q.removeAttribute("preload"),q.removeAttribute("src"),(0,p.emptyElement)(q),(0,m.style)(q,{objectFit:""}),ne=-1,!d.Browser.msie&&"load"in q&&q.load())}function B(){for(var e=q.seekable?q.seekable.length:0,t=1/0;e--;)t=Math.min(t,q.seekable.start(e));return t}function O(){for(var e=q.seekable?q.seekable.length:0,t=0;e--;)t=Math.max(t,q.seekable.end(e));return t}function j(){for(var e=-1,t=0;t<q.audioTracks.length;t++)if(q.audioTracks[t].enabled){e=t;break}F(e)}function R(e){z.trigger("fullscreenchange",{target:e.target,jwstate:re})}function H(e){if(se=null,e){if(e.length){for(var t=0;t<e.length;t++)if(e[t].enabled){ue=t;break}-1===ue&&(ue=0,e[ue].enabled=!0),se=x.default.map(e,function(e){return{name:e.label||e.language,language:e.language}})}z.addTracksListener(e,"change",j),se&&z.trigger("audioTracks",{currentTrack:ue,tracks:se})}}function F(e){q&&q.audioTracks&&se&&e>-1&&e<q.audioTracks.length&&e!==ue&&(q.audioTracks[ue].enabled=!1,ue=e,q.audioTracks[ue].enabled=!0,z.trigger("audioTrackChanged",{currentTrack:ue,tracks:se}))}function V(){return se||[]}function U(){return ue}function W(){if("hls"===ie[0].type){var e="video";if(0===q.videoHeight){if((d.OS.iOS||d.Browser.safari)&&q.readyState<2)return;e="audio"}z.trigger(l.MEDIA_TYPE,{mediaType:e})}}function G(){if(0!==J){var e=(0,A.default)(q.buffered);z.isLive()&&e&&ce===e?-1===oe&&(oe=setTimeout(function(){de=!0,X()},J)):(Y(),de=!1),ce=e}}function X(){return!(!de||!z.atEdgeOfLiveStream())&&(z.trigger(l.MEDIA_ERROR,{message:"The live stream is either down or has ended"}),!0)}function Y(){P(oe),oe=-1}this.state=l.STATE_IDLE,this.seeking=!1;var z=this,Q={progress:function(){f.default.progress.call(z),G()},timeupdate:function(){te!==q.currentTime&&(s(q.currentTime),f.default.timeupdate.call(z)),G(),d.Browser.ie&&n()},resize:n,ended:function(){ne=-1,Y(),f.default.ended.call(z)},loadedmetadata:function(){var e=z.getDuration();le&&e===1/0&&(e=0);var t={duration:e,height:q.videoHeight,width:q.videoWidth};z.trigger(l.MEDIA_META,t),n()},durationchange:function(){le||f.default.progress.call(z)},loadeddata:function(){f.default.loadeddata.call(z),H(q.audioTracks),v(z.getDuration())},canplay:function(){$=!0,le||W(),d.Browser.ie&&9===d.Browser.version.major&&z.setTextTracks(z._textTracks),f.default.canplay.call(z)},seeking:function(){var e=null!==ee?ee:z.getCurrentTime(),t=te;s(e),ee=null,Z=0,z.seeking=!0,z.trigger(l.MEDIA_SEEK,{position:t,offset:e})},seeked:function(){f.default.seeked.call(z)},waiting:function(){z.seeking?z.setState(l.STATE_LOADING):z.state===l.STATE_PLAYING&&(z.atEdgeOfLiveStream()&&z.setPlaybackRate(1),z.stallTime=z.getCurrentTime(),z.setState(l.STATE_STALLED))},webkitbeginfullscreen:function(e){re=!0,R(e)},webkitendfullscreen:function(e){re=!1,R(e)}};Object.keys(f.default).forEach(function(e){if(!Q[e]){var t=f.default[e];Q[e]=function(e){t.call(z,e)}}}),u(this,I.default,T.default,k.default,M.default,{renderNatively:function(e){return!(!d.OS.iOS&&!d.Browser.safari)||e&&d.Browser.chrome}(t.renderCaptionsNatively),eventsOn_:function(){r(Q,q)},eventsOff_:function(){a(Q,q)},detachMedia:function(){return k.default.detachMedia.call(z),Y(),this.removeTracksListener(q.textTracks,"change",this.textTrackChangeHandler),this.disableTextTrack(),q},attachMedia:function(){k.default.attachMedia.call(z),$=!1,this.seeking=!1,q.loop=!1,this.enableTextTrack(),this.renderNatively&&this.setTextTracks(this.video.textTracks),this.addTracksListener(q.textTracks,"change",this.textTrackChangeHandler)},isLive:function(){return q.duration===1/0}});var q=i,K={level:{}},J=null!==t.liveTimeout?t.liveTimeout:3e4,$=!1,Z=0,ee=null,te=null,ie=void 0,ne=-1,re=!1,ae=b.default.noop,se=null,ue=-1,oe=-1,de=!1,ce=null,le=!1;this.isSDK=!!t.sdkplatform,this.video=q,this.supportsPlaybackRate=!0,z.getCurrentTime=function(){return h(q.currentTime)},z.getDuration=function(){var e=q.duration;if(le&&e===1/0&&0===q.currentTime||isNaN(e))return 0;var t=O();if(z.isLive()&&t){var i=t-B();i!==1/0&&i>N&&(e=-i)}return e},this.stop=function(){Y(),L(),this.clearTracks(),d.Browser.ie&&q.pause(),this.setState(l.STATE_IDLE)},this.destroy=function(){ae=b.default.noop,a(Q,q),this.removeTracksListener(q.audioTracks,"change",j),this.removeTracksListener(q.textTracks,"change",z.textTrackChangeHandler),this.off()},this.init=function(e){_(e.sources);var t=ie[ne];le=(0,c.isAndroidHls)(t),le&&(z.supportsPlaybackRate=!1,Q.waiting=b.default.noop),z.eventsOn_(),ie.length&&"hls"!==ie[0].type&&this.sendMediaType(ie),K.reason=""},this.preload=function(e){_(e.sources);var t=ie[ne],i=t.preload||"metadata";"none"!==i&&(q.setAttribute("preload",i),C(t))},this.load=function(e){_(e.sources),w(e.starttime,e.duration),this.setupSideloadedTracks(e.tracks)},this.play=function(){return ae(),E()},this.pause=function(){Y(),ae=function(){if(q.paused&&q.currentTime&&z.isLive()){var e=O(),t=e-B(),i=t<N,n=e-q.currentTime;i&&e&&(n>15||n<0)&&(ee=Math.max(e-10,e-t),s(q.currentTime),q.currentTime=ee)}},q.pause()},this.seek=function(e){if(e<0&&(e+=B()+O()),$||($=!!O()),$){Z=0;try{z.seeking=!0,ee=e,s(q.currentTime),q.currentTime=e}catch(t){z.seeking=!1,Z=e}}else Z=e,d.Browser.firefox&&q.paused&&E()},this.setVisibility=function(e){e=!!e,e||d.OS.android?(0,m.style)(z.container,{visibility:"visible",opacity:1}):(0,m.style)(z.container,{visibility:"",opacity:0})},this.resize=function(e,t,i){if(e&&t&&q.videoWidth&&q.videoHeight){var n={objectFit:"",width:"",height:""};if("uniform"===i){var r=e/t,a=q.videoWidth/q.videoHeight;Math.abs(r-a)<.09&&(n.objectFit="fill",i="exactfit")}if(d.Browser.ie||d.OS.iOS&&d.OS.version.major<9||d.Browser.androidNative){var s=-Math.floor(q.videoWidth/2+1),u=-Math.floor(q.videoHeight/2+1),o=Math.ceil(100*e/q.videoWidth)/100,c=Math.ceil(100*t/q.videoHeight)/100;"none"===i?o=c=1:"fill"===i?o=c=Math.max(o,c):"uniform"===i&&(o=c=Math.min(o,c)),n.width=q.videoWidth,n.height=q.videoHeight,n.top=n.left="50%",n.margin=0,(0,m.transform)(q,"translate("+s+"px, "+u+"px) scale("+o.toFixed(2)+", "+c.toFixed(2)+")")}(0,m.style)(q,n)}},this.setFullscreen=function(e){if(e=!!e){return!(b.default.tryCatch(function(){var e=q.webkitEnterFullscreen||q.webkitEnterFullScreen;e&&e.apply(q)})instanceof b.default.Error)&&z.getFullScreen()}var t=q.webkitExitFullscreen||q.webkitExitFullScreen;return t&&t.apply(q),e},z.getFullScreen=function(){return re||!!q.webkitDisplayingFullscreen},this.setCurrentQuality=function(e){if(ne!==e&&e>=0&&ie&&ie.length>e){ne=e,K.reason="api",K.level={},this.trigger(l.MEDIA_LEVEL_CHANGED,{currentQuality:e,levels:g(ie)}),t.qualityLabel=ie[e].label;var i=q.currentTime||0;z.getDuration();w(i),E()}},this.setPlaybackRate=function(e){q.playbackRate=q.defaultPlaybackRate=e},this.getPlaybackRate=function(){return q.playbackRate},this.getCurrentQuality=function(){return ne},this.getQualityLevels=function(){return x.default.map(ie,function(e){return(0,o.qualityLevel)(e)})},this.getName=function(){return{name:D}},this.setCurrentAudioTrack=F,this.getAudioTracks=V,this.getCurrentAudioTrack=U}Object.defineProperty(t,"__esModule",{value:!0});var u=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var i=arguments[t];for(var n in i)Object.prototype.hasOwnProperty.call(i,n)&&(e[n]=i[n])}return e},o=i(177),d=i(11),c=i(44),l=i(5),h=i(178),f=n(h),v=i(179),T=n(v),g=i(180),k=n(g),m=i(24),_=i(6),b=n(_),p=i(23),y=i(0),x=n(y),E=i(45),w=n(E),C=i(7),I=n(C),L=i(181),M=n(L),B=i(176),A=n(B),O=i(95),S=n(O),P=window.clearTimeout,N=120,D="html5";u(s.prototype,w.default),s.getName=function(){return{name:"html5"}},t.default=s},93:function(e,t,i){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function r(e,t,i){e.xhr=f.default.ajax(e.file,function(n){u(n,e,t,i)},i)}function a(e){e&&e.forEach(function(e){var t=e.xhr;t&&(t.onload=null,t.onreadystatechange=null,t.onerror=null,"abort"in t&&t.abort()),delete e.xhr})}function s(e){return e.map(function(e){return new c.default(e.begin,e.end,e.text)})}function u(e,t,i,n){var r,a,u=e.responseXML?e.responseXML.firstChild:null;if(u)for("xml"===(0,v.localName)(u)&&(u=u.nextSibling);u.nodeType===u.COMMENT_NODE;)u=u.nextSibling;try{if(u&&"tt"===(0,v.localName)(u))r=(0,m.default)(e.responseXML),a=s(r),delete t.xhr,i(a);else{var d=e.responseText;d.indexOf("WEBVTT")>=0?o().then(function(e){var n=new e(window);a=[],n.oncue=function(e){a.push(e)},n.onflush=function(){delete t.xhr,i(a)},n.parse(d)}).catch(function(e){delete t.xhr,n(e)}):(r=(0,g.default)(d),a=s(r),delete t.xhr,i(a))}}catch(e){delete t.xhr,n(e)}}function o(){return i.e(8).then(function(require){return i(97).default}.bind(null,i)).catch(l.chunkLoadErrorHandler)}Object.defineProperty(t,"__esModule",{value:!0}),t.loadFile=r,t.cancelXhr=a,t.convertToVTTCues=s;var d=i(96),c=n(d),l=i(12),h=i(6),f=n(h),v=i(13),T=i(77),g=n(T),k=i(98),m=n(k)},94:function(e,t,i){"use strict";function n(e,t){var i=e.kind||"cc";return e.default||e.defaulttrack?"default":e._id||e.file||i+t}function r(e,t){var i=e.label||e.name||e.language;return i||(i="Unknown CC",(t+=1)>1&&(i+=" ["+t+"]")),{label:i,unknownCount:t}}Object.defineProperty(t,"__esModule",{value:!0}),t.createId=n,t.createLabel=r},95:function(e,t,i){"use strict";function n(e){return new a.default(function(t,i){if(e.paused)return i(new Error("Play refused."));var n=function(){e.removeEventListener("playing",r),e.removeEventListener("pause",r),e.removeEventListener("abort",r),e.removeEventListener("error",r)},r=function(e){n(),"playing"===e.type?t():i(new Error('The play() request was interrupted by a "'+e.type+'" event.'))};e.addEventListener("playing",r),e.addEventListener("abort",r),e.addEventListener("error",r),e.addEventListener("pause",r)})}Object.defineProperty(t,"__esModule",{value:!0}),t.default=n;var r=i(4),a=function(e){return e&&e.__esModule?e:{default:e}}(r)},96:function(e,t,i){"use strict";function n(e){return"string"==typeof e&&(!!{"":!0,lr:!0,rl:!0}[e.toLowerCase()]&&e.toLowerCase())}function r(e){return"string"==typeof e&&(!!{start:!0,middle:!0,end:!0,left:!0,right:!0}[e.toLowerCase()]&&e.toLowerCase())}Object.defineProperty(t,"__esModule",{value:!0});var a=window.VTTCue;if(!a){a=function(e,t,i){var a=this;a.hasBeenReset=!1;var s="",u=!1,o=e,d=t,c=i,l=null,h="",f=!0,v="auto",T="start",g="auto",k=100,m="middle";Object.defineProperty(a,"id",{enumerable:!0,get:function(){return s},set:function(e){s=""+e}}),Object.defineProperty(a,"pauseOnExit",{enumerable:!0,get:function(){return u},set:function(e){u=!!e}}),Object.defineProperty(a,"startTime",{enumerable:!0,get:function(){return o},set:function(e){if("number"!=typeof e)throw new TypeError("Start time must be set to a number.");o=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"endTime",{enumerable:!0,get:function(){return d},set:function(e){if("number"!=typeof e)throw new TypeError("End time must be set to a number.");d=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"text",{enumerable:!0,get:function(){return c},set:function(e){c=""+e,this.hasBeenReset=!0}}),Object.defineProperty(a,"region",{enumerable:!0,get:function(){return l},set:function(e){l=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"vertical",{enumerable:!0,get:function(){return h},set:function(e){var t=n(e);if(!1===t)throw new SyntaxError("An invalid or illegal string was specified.");h=t,this.hasBeenReset=!0}}),Object.defineProperty(a,"snapToLines",{enumerable:!0,get:function(){return f},set:function(e){f=!!e,this.hasBeenReset=!0}}),Object.defineProperty(a,"line",{enumerable:!0,get:function(){return v},set:function(e){if("number"!=typeof e&&"auto"!==e)throw new SyntaxError("An invalid number or illegal string was specified.");v=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"lineAlign",{enumerable:!0,get:function(){return T},set:function(e){var t=r(e);if(!t)throw new SyntaxError("An invalid or illegal string was specified.");T=t,this.hasBeenReset=!0}}),Object.defineProperty(a,"position",{enumerable:!0,get:function(){return g},set:function(e){if(e<0||e>100)throw new Error("Position must be between 0 and 100.");g=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"size",{enumerable:!0,get:function(){return k},set:function(e){if(e<0||e>100)throw new Error("Size must be between 0 and 100.");k=e,this.hasBeenReset=!0}}),Object.defineProperty(a,"align",{enumerable:!0,get:function(){return m},set:function(e){var t=r(e);if(!t)throw new SyntaxError("An invalid or illegal string was specified.");m=t,this.hasBeenReset=!0}}),a.displayState=void 0},a.prototype.getCueAsHTML=function(){return window.WebVTT.convertCueToDOMTree(window,this.text)}}t.default=a},98:function(e,t,i){"use strict";function n(e){r(e);var t=[],i=e.getElementsByTagName("p"),n=30,u=e.getElementsByTagName("tt");if(u&&u[0]){var o=parseFloat(u[0].getAttribute("ttp:frameRate"));isNaN(o)||(n=o)}r(i),i.length||(i=e.getElementsByTagName("tt:p"),i.length||(i=e.getElementsByTagName("tts:p")));for(var d=0;d<i.length;d++){for(var c=i[d],l=c.getElementsByTagName("br"),h=0;h<l.length;h++){var f=l[h];f.parentNode.replaceChild(e.createTextNode("\r\n"),f)}var v=c.innerHTML||c.textContent||c.text||"",T=(0,s.trim)(v).replace(/>\s+</g,"><").replace(/(<\/?)tts?:/g,"$1").replace(/<br.*?\/>/g,"\r\n");if(T){var g=c.getAttribute("begin"),k=c.getAttribute("dur"),m=c.getAttribute("end"),_={begin:(0,s.seconds)(g,n),text:T};m?_.end=(0,s.seconds)(m,n):k&&(_.end=_.begin+(0,s.seconds)(k,n)),t.push(_)}}return t.length||a(),t}function r(e){e||a()}function a(){throw new Error("Invalid DFXP file")}Object.defineProperty(t,"__esModule",{value:!0}),t.default=n;var s=i(1)}});