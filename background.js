/*
Copyright 2014 Google Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var AltGr = { PLAIN: "plain", ALTERNATE: "alternate" };
var Shift = { PLAIN: "plain", SHIFTED: "shifted" };

var States = { WAITING_FOR_COMPOSE_KEY: 0, COMPOSING : 1};

var state = States.WAITING_FOR_COMPOSE_KEY;
var contextID = -1;
var keysMemory = [];
var sequenceMaxLength = 3;


    
function initialize(currentContextID) {
    state = States.WAITING_FOR_COMPOSE_KEY;
    contextID = currentContextID;
    keysMemory = [];
 
}


chrome.input.ime.onFocus.addListener(function(context) {
  initialize(context.contextID);
});

chrome.input.ime.onBlur.addListener(function(context) {
  initialize(-1);
});

function isPrintableKey(key) {
  var charCode = key.charCodeAt(0);
  return charCode >= 32 && charCode <= 126;
}

function memorizeKey(keyData) {
 if (keyData.type == "keyup" || isPureModifier(keyData)) return false;
 
  if (isPrintableKey(keyData.key)) {
    keysMemory.push(keyData.key);
    return true;
  }
  
  return false;
}

function isPureModifier(keyData) {
  return (keyData.key == "Shift") || (keyData.key == "Ctrl") || (keyData.key == "Alt");
}

function resetComposition() {
  state = States.WAITING_FOR_COMPOSE_KEY;
  keysMemory = [];
}

function getComposition() {
  return keysMemory.join("");
}

function compositionDone() {
  var composition = getComposition();
  return (lut[composition] != undefined) || composition.length > sequenceMaxLength;
}
  
function unravelComposition() {
  var handled = false;
  var composition = getComposition();
  
  if (lut[composition]) {
        chrome.input.ime.commitText({"contextID": contextID, "text": lut[composition]});   
  }
  
  resetComposition();
}


chrome.input.ime.onKeyEvent.addListener(
    function(engineID, keyData) {
      var handled = false;
      
      var isComposeKeyDownEvent = (keyData.code == "AltRight" && keyData.type == "keydown");
      if (isComposeKeyDownEvent) {
        switch (state) {
          case States.WAITING_FOR_COMPOSE_KEY:
            state = States.COMPOSING;
            handled = true;
            break;
          case States.COMPOSING:
            // Break out of Compose mode on extra Compose key press.
            resetComposition();
            handled = true;
            break;
          default:
            break;
        }
        return handled;
      }

      if (state == States.COMPOSING) {
        if (memorizeKey(keyData)) {
         handled = true;
         if (compositionDone()) {
            unravelComposition();
         }
        }
      }
      
      return handled;
});
