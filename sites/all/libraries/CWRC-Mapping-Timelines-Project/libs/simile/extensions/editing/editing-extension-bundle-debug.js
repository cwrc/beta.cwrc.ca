﻿/* editing-backend.js */
Exhibit.EditingBackend = function () {
    this._nodeTree = {};
    this._dataTree = {};
};
Exhibit.EditingBackend.prototype.rebuildNodeTree = function (lensRoot, templateRoot) {
    if (root == undefined || root == null) {
        root = document.body;
    }
    var nodeTree = [];
    var walk = function (lensNode, templateNode, propertyID) {
        var newPropertyID;
        if ((newPropertyID = Exhibit.getAttribute(templateNode, "ex:property")) != null) {
            nodeTree.properties[newPropertyID] = [];
            walkItem(node, newPropertyID);
        } else {
            if (templateNode.className == "editable-exhibit-value" || templateNode.className == "modified-exhibit_value") {
                nodeTree.properties[propertyID].push(node);
            } else {
                for (var childI = 0;
                     childI < node.childNodes.length;
                     childI++) {
                    walk(node.childNodes[childI], propertyID);
                }
            }
        }
    };
    return this._nodeTree = walk(lensRoot, templateRoot, null);
};
Exhibit.EditingBackend.prototype.rebuildDataTree = function (database) {
    this._mode = (database == undefined || database == null) ? "full" : "diff";
    var dataTree = [];
    for (var itemID in this._nodeTree) {
        if (this._mode = "full") {
            var allProperties = database.getAllProperties();
            var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, allProperties, database);
            dataTree[itemID] = {};
            for (var j = 0;
                 j < pairs.length;
                 j++) {
                var pair = pairs[j];
                dataTree[itemID][pair.propertyID] = [];
                for (var i = 0;
                     i < pair.values.length;
                     i++) {
                    dataTree[itemID][pair.propertyID].push(pair.values[i]);
                }
            }
        }
        for (var propertyID in this._nodeTree[i].properties) {
            dataTree[itemID][propertyID] = [];
            valueNodes = this._nodeTree[itemID].properties[propertyID];
            for (var v = 0;
                 v < values.length;
                 v++) {
                dataTree[itemID][propertyID].push(Exhibit.EditingBackend.getNodeValue(valueNodes));
            }
        }
    }
    return this._dataTree = dataTree;
};
Exhibit.EditingBackend.getNodeValue = function (valueNode) {
    if (valueNode.tag.toLowerCase() == "input") {
        return valueNode.value;
    } else {
        return valueNode.innerHTML;
    }
};


/* extra.js */
Exhibit.UI.makeEditValueSpan = function (label, valueType, layer, showRemoveIcon) {
    var span = document.createElement("span");
    span.className = "exhibit-value";
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = label;
    span.appendChild(input);
    if (showRemoveIcon) {
        var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
        removeImg.width = 10;
        removeImg.height = 10;
        removeImg.style.margin = 0;
        removeImg.title = "remove value";
        SimileAjax.WindowManager.registerEvent(removeImg, "click", function (elmt, evt, target) {
            span.parentNode.removeChild(span);
        });
        span.appendChild(removeImg);
    }
    return span;
};
Exhibit.UI.makeEditItemSpan = function (itemID, label, uiContext, layer) {
    if (label == null) {
        label = database.getObject(itemID, "label");
        if (label == null) {
            label = itemID;
        }
    }
    var a = SimileAjax.DOM.createElementFromString('<a href="' + Exhibit.Persistence.getItemLink(itemID) + "\" class='exhibit-item'>" + label + "</a>");
    var handler = function (elmt, evt, target) {
        Exhibit.UI.showEditItemInPopup(itemID, elmt, uiContext);
    };
    SimileAjax.WindowManager.registerEvent(a, "click", handler, layer);
    return a;
};
Exhibit.UI.correctPopupBehavior = function (lens, itemID, div, uiContext) {
    div.firstChild.style.display = "none";
    div.lastChild.onclick = "";
    SimileAjax.WindowManager.registerEvent(div.lastChild, "click", function (elmt, evt, target) {
        lens._saveFromEditingLens(itemID, div, uiContext);
    });
};
Exhibit.UI.showEditItemInPopup = function (itemID, elmt, uiContext) {
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    var bubble = SimileAjax.Graphics.createBubbleForPoint(coords.left + Math.round(elmt.offsetWidth / 2), coords.top + Math.round(elmt.offsetHeight / 2), uiContext.getSetting("bubbleWidth"), uiContext.getSetting("bubbleHeight"));
    var itemLensDiv = document.createElement("div");
    var itemLens = uiContext.getLensRegistry().createLens(itemID, itemLensDiv, uiContext, true);
    itemLens._convertLens(itemID, itemLensDiv, uiContext, true);
    Exhibit.UI.correctPopupBehavior(itemLens, itemID, itemLensDiv, uiContext);
    bubble.content.appendChild(itemLensDiv);
};
Exhibit.Database._Impl.prototype.getItem = function (itemID) {
    if (this._items.contains(itemID)) {
        this._items[itemID];
    }
    return null;
};
Exhibit.Database._Impl.prototype.reloadItem = function (itemID, itemEntry) {
    try {
        for (p in itemEntry) {
            this.removeObjects(itemID, p);
        }
        var o = {};
        o.items = [itemEntry];
        database.loadData(o);
    } catch (e) {
        alert(e);
    }
};
Exhibit.createPopupMenu = function (element, align) {
    var div = document.createElement("div");
    div.className = "exhibit-menu-popup exhibit-ui-protection";
    var dom = {elmt: div, close: function () {
        try {
            document.body.removeChild(this.elmt);
        } catch (e) {
        }
    }, open: function () {
        var self = this;
        this.layer = SimileAjax.WindowManager.pushLayer(function () {
            self.close();
        }, true, this.elmt);
        document.body.appendChild(div);
        var docWidth = document.body.offsetWidth;
        var docHeight = document.body.offsetHeight;
        var coords = SimileAjax.DOM.getPageCoordinates(element);
        if (align == "center") {
            div.style.top = (coords.top + element.scrollHeight) + "px";
            div.style.left = (coords.left + Math.ceil(element.offsetWidth - div.offsetWidth) / 2) + "px";
        } else {
            if (align == "right") {
                div.style.top = coords.top + "px";
                div.style.left = (coords.left + div.offsetWidth) + "px";
            } else {
                div.style.top = (coords.top + element.scrollHeight) + "px";
                div.style.left = coords.left + "px";
            }
        }
    }, makeMenuItem: function (label, icon, onClick) {
        var self = this;
        var a = document.createElement("a");
        a.className = "exhibit-menu-item";
        a.href = "javascript:";
        a.onmouseover = function () {
            self._mouseoverMenuItem(a);
        };
        if (onClick != null) {
            SimileAjax.WindowManager.registerEvent(a, "click", function (elmt, evt, target) {
                onClick(elmt, evt, target);
                SimileAjax.WindowManager.popLayer(self.layer);
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            });
        }
        var div = document.createElement("div");
        a.appendChild(div);
        div.appendChild(SimileAjax.Graphics.createTranslucentImage(icon != null ? icon : (Exhibit.urlPrefix + "images/blank-16x16.png")));
        div.appendChild(document.createTextNode(label));
        return a;
    }, appendMenuItem: function (label, icon, onClick) {
        this.elmt.appendChild(this.makeMenuItem(label, icon, onClick));
    }, makeSectionHeading: function (label) {
        var div = document.createElement("div");
        div.className = "exhibit-menu-section";
        div.innerHTML = label;
        return div;
    }, appendSectionHeading: function (label, icon) {
        this.elmt.appendChild(this.makeSectionHeading(label, icon));
    }, makeSubMenu: function (label, parentElmt) {
        var self = this;
        var a = document.createElement("a");
        a.className = "exhibit-menu-item potluck-submenu";
        a.href = "javascript:";
        var subdom = Exhibit.createPopupMenu(a, "right");
        a.onmousemove = function () {
            self._mousemoveSubmenu(a, subdom);
        };
        var div = document.createElement("div");
        a.appendChild(div);
        var table = document.createElement("table");
        table.cellSpacing = 0;
        table.cellPadding = 0;
        table.width = "100%";
        div.appendChild(table);
        var tr = table.insertRow(0);
        var td = tr.insertCell(0);
        td.appendChild(document.createTextNode(label));
        td = tr.insertCell(1);
        td.align = "right";
        td.style.verticalAlign = "middle";
        td.appendChild(Exhibit.UI.createTranslucentImage("images/submenu.png"));
        parentElmt.appendChild(a);
        return subdom;
    }, appendSubMenu: function (label) {
        return this.makeSubMenu(label, div);
    }, appendSeparator: function () {
        var hr = document.createElement("hr");
        this.elmt.appendChild(hr);
    }, _mousemoveSubmenu: function (submenu, submenuDom) {
        if (this._submenu != null) {
            if (this._submenu != submenu) {
                if (this._timer != null) {
                    window.clearTimeout(this._timer);
                    this._timer = null;
                }
                var self = this;
                this._timer = window.setTimeout(function () {
                    self._timer = null;
                    self._closeSubmenu();
                    self._openSubmenu(submenu, submenuDom);
                }, 200);
            }
        } else {
            this._openSubmenu(submenu, submenuDom);
        }
    }, _mouseoverMenuItem: function (menuItem) {
        var self = this;
        if (this._submenu != null && this._timer == null) {
            this._timer = window.setTimeout(function () {
                self._timer = null;
                self._closeSubmenu();
            }, 200);
        }
    }, _openSubmenu: function (submenu, submenuDom) {
        this._submenu = submenu;
        this._submenuDom = submenuDom;
        submenuDom.open();
    }, _closeSubmenu: function () {
        if (this._submenuDom != null) {
            this._submenuDom.close();
        }
        this._submenu = null;
        this._submenuDom = null;
    }, _submenu: null, _submenuDom: null, _timer: null};
    return dom;
};
Exhibit.UI.removeChildren = function (elmt) {
    for (var i = elmt.childNodes.length;
         i > 0;
         i--) {
        elmt.removeChild(elmt.lastChild);
    }
};
Exhibit.UI.findClassMembers = function (className, node) {
    var values = [];
    var walk = function (node) {
        if (node.className == className) {
            values.push(node);
        } else {
            for (var i = 0;
                 i < node.childNodes.length;
                 i++) {
                walk(node.childNodes[i]);
            }
        }
    };
    walk(node);
    return values;
};
Exhibit.ViewPanel.getPropertyValuesPairs = function (itemID, propertyEntries, database) {
    var pairs = [];
    var enterPair = function (propertyID, forward) {
        var property = database.getProperty(propertyID);
        var values = forward ? database.getObjects(itemID, propertyID) : database.getSubjects(itemID, propertyID);
        var count = values.size();
        if (count > 0) {
            var itemValues = property.getValueType() == "item";
            var pair = {propertyID: propertyID, propertyLabel: forward ? (count > 1 ? property.getPluralLabel() : property.getLabel()) : (count > 1 ? property.getReversePluralLabel() : property.getReverseLabel()), valueType: property.getValueType(), values: []};
            if (itemValues) {
                values.visit(function (value) {
                    var label = database.getObject(value, "label");
                    pair.values.push(label != null ? label : value);
                });
            } else {
                values.visit(function (value) {
                    pair.values.push(value);
                });
            }
            pairs.push(pair);
        }
    };
    for (var i = 0;
         i < propertyEntries.length;
         i++) {
        var entry = propertyEntries[i];
        if (typeof entry == "string") {
            enterPair(entry, true);
        } else {
            enterPair(entry.property, entry.forward);
        }
    }
    return pairs;
};
Exhibit.TileView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.TileView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    view._editSetting = Exhibit.getAttribute(configElmt, "editing");
    if (view._editSetting == null) {
        view._editSetting = false;
    }
    view._initializeUI();
    return view;
};
Exhibit.TileView.prototype._reconstruct = function () {
    var view = this;
    var state = {div: this._dom.bodyDiv, contents: null, groupDoms: [], groupCounts: []};
    var closeGroups = function (groupLevel) {
        for (var i = groupLevel;
             i < state.groupDoms.length;
             i++) {
            state.groupDoms[i].countSpan.innerHTML = state.groupCounts[i];
        }
        state.groupDoms = state.groupDoms.slice(0, groupLevel);
        state.groupCounts = state.groupCounts.slice(0, groupLevel);
        if (groupLevel > 0) {
            state.div = state.groupDoms[groupLevel - 1].contentDiv;
        } else {
            state.div = view._dom.bodyDiv;
        }
        state.contents = null;
    };
    this._orderedViewFrame.onNewGroup = function (groupSortKey, keyType, groupLevel) {
        closeGroups(groupLevel);
        var groupDom = Exhibit.TileView.constructGroup(groupLevel, groupSortKey);
        state.div.appendChild(groupDom.elmt);
        state.div = groupDom.contentDiv;
        state.groupDoms.push(groupDom);
        state.groupCounts.push(0);
    };
    this._orderedViewFrame.onNewItem = function (itemID, index) {
        if (state.contents == null) {
            state.contents = Exhibit.TileView.constructList();
            state.div.appendChild(state.contents);
        }
        for (var i = 0;
             i < state.groupCounts.length;
             i++) {
            state.groupCounts[i]++;
        }
        var itemLensItem = document.createElement("li");
        var itemLens = view._uiContext.getLensRegistry().createLens(itemID, itemLensItem, view._uiContext, view._editSetting);
        state.contents.appendChild(itemLensItem);
    };
    this._div.style.display = "none";
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    this._div.style.display = "block";
};
Exhibit.ThumbnailView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.ThumbnailView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext, true));
    view._lensRegistry = Exhibit.UIContext.createLensRegistryFromDOM(configElmt, configuration, uiContext.getLensRegistry());
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    view._editSetting = Exhibit.getAttribute(configElmt, "editing");
    if (view._editSetting == null) {
        view._editSetting = false;
    }
    view._initializeUI();
    return view;
};
Exhibit.ThumbnailView.prototype._reconstruct = function () {
    var view = this;
    var state = {div: this._dom.bodyDiv, itemContainer: null, groupDoms: [], groupCounts: []};
    var closeGroups = function (groupLevel) {
        for (var i = groupLevel;
             i < state.groupDoms.length;
             i++) {
            state.groupDoms[i].countSpan.innerHTML = state.groupCounts[i];
        }
        state.groupDoms = state.groupDoms.slice(0, groupLevel);
        state.groupCounts = state.groupCounts.slice(0, groupLevel);
        if (groupLevel > 0) {
            state.div = state.groupDoms[groupLevel - 1].contentDiv;
        } else {
            state.div = view._dom.bodyDiv;
        }
        state.itemContainer = null;
    };
    this._orderedViewFrame.onNewGroup = function (groupSortKey, keyType, groupLevel) {
        closeGroups(groupLevel);
        var groupDom = Exhibit.ThumbnailView.constructGroup(groupLevel, groupSortKey);
        state.div.appendChild(groupDom.elmt);
        state.div = groupDom.contentDiv;
        state.groupDoms.push(groupDom);
        state.groupCounts.push(0);
    };
    this._orderedViewFrame.onNewItem = function (itemID, index) {
        if (state.itemContainer == null) {
            state.itemContainer = Exhibit.ThumbnailView.constructItemContainer();
            state.div.appendChild(state.itemContainer);
        }
        for (var i = 0;
             i < state.groupCounts.length;
             i++) {
            state.groupCounts[i]++;
        }
        var itemLensDiv = document.createElement("div");
        itemLensDiv.className = SimileAjax.Platform.browser.isIE ? "exhibit-thumbnailView-itemContainer-IE" : "exhibit-thumbnailView-itemContainer";
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext, view._editSetting);
        state.itemContainer.appendChild(itemLensDiv);
    };
    this._div.style.display = "none";
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    this._div.style.display = "block";
};


/* editing-formatter.js */
Exhibit.Formatter._ListFormatter.prototype.formatList = function (values, count, valueType, appender, editing) {
    var uiContext = this._uiContext;
    var self = this;
    if (count == 0) {
        if (this._emptyText != null && this._emptyText.length > 0) {
            appender(document.createTextNode(this._emptyText));
        }
    } else {
        if (count == 1) {
            values.visit(function (v) {
                uiContext.format(v, valueType, appender, editing);
            });
        } else {
            var index = 0;
            if (count == 2) {
                values.visit(function (v) {
                    uiContext.format(v, valueType, appender, editing);
                    index++;
                    if (index == 1) {
                        appender(document.createTextNode(self._pairSeparator));
                    }
                });
            } else {
                values.visit(function (v) {
                    uiContext.format(v, valueType, appender, editing);
                    index++;
                    if (index < count) {
                        appender(document.createTextNode((index == count - 1) ? self._lastSeparator : self._separator));
                    }
                });
            }
        }
    }
};
Exhibit.Formatter._TextFormatter.prototype.format = function (value, appender, editing) {
    var self = this;
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    if (editing && !editing) {
        span.setAttribute("ex:value", value);
        span.className = "editable-exhibit-value";
        SimileAjax.WindowManager.registerEvent(span, "click", function () {
            var newSpan = document.createElement("span");
            newSpan.setAttribute("ex:value", value);
            var input = document.createElement("input");
            input.style.width = span.style.width;
            input.value = value;
            newSpan.className = "editing-parent";
            newSpan.appendChild(input);
            SimileAjax.WindowManager.registerEvent(input, "blur", function () {
                var parent = newSpan.parentNode;
                var newValue = input.value;
                self.format(newValue, function (respan) {
                    respan.setAttribute("ex:value", value);
                    respan.className = newValue == value ? "editable-exhibit-value" : "modified-exhibit-value";
                    appender(respan);
                }, editing);
                parent.removeChild(newSpan);
            });
            span.parentNode.replaceChild(newSpan, span);
        });
    }
    appender(span);
};
Exhibit.Formatter._BooleanFormatter.prototype.format = function (value, appender, editing) {
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    appender(span);
};
Exhibit.Formatter._BooleanFormatter.prototype.formatText = function (value) {
    return(typeof value == "boolean" ? value : (typeof value == "string" ? (value == "true") : false)) ? "true" : "false";
};
Exhibit.Formatter._NumberFormatter.prototype.format = function (value, appender, editing) {
    appender(document.createTextNode(this.formatText(value)));
};
Exhibit.Formatter._NumberFormatter.prototype.formatText = function (value) {
    if (this._decimalDigits == -1) {
        return value.toString();
    } else {
        return new Number(value).toFixed(this._decimalDigits);
    }
};
Exhibit.Formatter._ImageFormatter.prototype.format = function (value, appender, editing) {
    var img = document.createElement("img");
    img.src = value;
    if (this._tooltip != null) {
        if (typeof this._tooltip == "string") {
            img.title = this._tootlip;
        } else {
            img.title = this._tooltip.evaluateSingleOnItem(this._uiContext.getSetting("itemID"), this._uiContext.getDatabase()).value;
        }
    }
    appender(img);
};
Exhibit.Formatter._ImageFormatter.prototype.formatText = function (value) {
    return value;
};
Exhibit.Formatter._URLFormatter.prototype.format = function (value, appender, editing) {
    var a = document.createElement("a");
    a.href = value;
    a.innerHTML = value;
    if (this._target != null) {
        a.target = this._target;
    }
    if (this._externalIcon != null) {
    }
    appender(a);
};
Exhibit.Formatter._URLFormatter.prototype.formatText = function (value) {
    return value;
};
Exhibit.Formatter._CurrencyFormatter.prototype.format = function (value, appender, editing) {
    var text = this.formatText(value);
    if (value < 0 && this._negativeFormat.red) {
        var span = document.createElement("span");
        span.innerHTML = text;
        span.style.color = "red";
        appender(span);
    } else {
        appender(document.createTextNode(text));
    }
};
Exhibit.Formatter._CurrencyFormatter.prototype.formatText = function (value) {
    var negative = value < 0;
    var text;
    if (this._decimalDigits == -1) {
        text = Math.abs(value);
    } else {
        text = new Number(Math.abs(value)).toFixed(this._decimalDigits);
    }
    var sign = (negative && this._negativeFormat.signed) ? "-" : "";
    if (negative && this._negativeFormat.parentheses) {
        text = "(" + text + ")";
    }
    switch (this._negativeFormat) {
        case"first":
            text = this._symbol + sign + text;
            break;
        case"after-sign":
            text = sign + this._symbol + text;
            break;
        case"last":
            text = sign + text + this._symbol;
            break;
    }
    return text;
};
Exhibit.Formatter._ItemFormatter.prototype.format = function (value, appender, editing) {
    var self = this;
    var title = this.formatText(value);
    var a = SimileAjax.DOM.createElementFromString('<a href="' + Exhibit.Persistence.getItemLink(value) + "\" class='exhibit-item'>" + title + "</a>");
    var handler = function (elmt, evt, target) {
        Exhibit.UI.showItemInPopup(value, elmt, self._uiContext);
    };
    SimileAjax.WindowManager.registerEvent(a, "click", handler, this._uiContext.getSetting("layer"));
    appender(a);
};
Exhibit.Formatter._ItemFormatter.prototype.formatText = function (value) {
    var database = this._uiContext.getDatabase();
    var title = null;
    if (this._title == null) {
        title = database.getObject(value, "label");
    } else {
        title = this._title.evaluateSingleOnItem(value, database).value;
    }
    if (title == null) {
        title = value;
    }
    return title;
};
Exhibit.Formatter._DateFormatter.prototype.format = function (value, appender, editing) {
    appender(document.createTextNode(this.formatText(value)));
};
Exhibit.Formatter._DateFormatter.prototype.formatText = function (value) {
    var date = (value instanceof Date) ? value : SimileAjax.DateTime.parseIso8601DateTime(value);
    if (date == null) {
        return value;
    }
    date.setTime(date.getTime() + this._timeZoneOffset);
    var text = "";
    var segments = this._segments;
    for (var i = 0;
         i < segments.length;
         i++) {
        var segment = segments[i];
        if (typeof segment == "string") {
            text += segment;
        } else {
            text += segment(date);
        }
    }
    return text;
};


/* editing-lens.js */
Exhibit.EditingLens = {};
var NO_EDITING = 0;
var SIMPLE_EDITING = 1;
var ADVANCED_EDITING = 2;
Exhibit.EditingLens = function (itemID, div, uiContext, restore) {
    var self = this;
    this._rootNode = div;
    var database = uiContext.getDatabase();
    this.backend = new Exhibit.EditingBackend();
    this._getItemData = function () {
        var itemData = {};
        var allProperties = database.getAllProperties();
        var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, allProperties, database);
        for (var j = 0;
             j < pairs.length;
             j++) {
            var pair = pairs[j];
            itemData[pair.propertyID] = [];
            for (var i = 0;
                 i < pair.values.length;
                 i++) {
                itemData[pair.propertyID].push(pair.values[i]);
            }
        }
        return itemData;
    };
    this._restore = function () {
        Exhibit.UI.removeChildren(self._rootNode);
        div.style.marginBottom = "0em";
        div.style.marginTop = "0em";
        div.style.border = "none";
        restore(self);
    };
    this._revert = function () {
        self._itemData = this._getItemData();
    };
    this._revert();
};
Exhibit.EditingLens._getAreEditing = function (uiContext) {
    if (!uiContext.areEditing) {
        uiContext.areEditing = {};
    }
    return uiContext.areEditing;
};
Exhibit.EditingLens.setEditing = function (itemID, editMode, uiContext) {
    var areEditing = Exhibit.EditingLens._getAreEditing(uiContext);
    switch (editMode) {
        case SIMPLE_EDITING:
        case ADVANCED_EDITING:
            areEditing[itemID] = editMode;
            break;
        default:
            areEditing[itemID] = NO_EDITING;
    }
};
Exhibit.EditingLens.getEditing = function (itemID, uiContext) {
    var areEditing = Exhibit.EditingLens._getAreEditing(uiContext);
    return areEditing[itemID];
};
Exhibit.EditingLens.create = function (itemID, div, uiContext, lens, restore, startEditing) {
    if (startEditing == undefined || startEditing == null) {
        Exhibit.EditingLens.setEditing(itemID, NO_EDITING, uiContext);
    } else {
        Exhibit.EditingLens.setEditing(itemID, startEditing, uiContext);
    }
    return new Exhibit.EditingLens(itemID, div, uiContext, restore);
};
Exhibit.EditingLens.prototype._constructDefaultUI = function (itemID, div, uiContext) {
    var self = this;
    var database = uiContext.getDatabase();
    if (this._commonProperties == null) {
        this._commonProperties = database.getAllProperties();
    }
    var properties = this._commonProperties;
    var label = database.getObject(itemID, "label");
    var template = {elmt: div, className: "exhibit-lens", children: [
        {tag: "div", className: "exhibit-lens-title", field: "titlebar", title: label, children: [label]},
        {tag: "div", className: "exhibit-lens-body", children: [
            {tag: "table", className: "exhibit-lens-properties", field: "propertiesTable"}
        ]},
        {tag: "div", className: "exhibit-lens-title", title: label, children: [label]},
    ]};
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    div.setAttribute("ex:itemID", itemID);
    this._TBody = dom.propertiesTable.tBodies[0];
    var allProperties = database.getAllProperties();
    var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, allProperties, database);
    for (var j = 0;
         j < pairs.length;
         j++) {
        var pair = pairs[j];
        var tr = dom.propertiesTable.insertRow(j);
        tr.className = "exhibit-lens-property";
        tr.setAttribute("ex:propertyID", pair.propertyID);
        var tdName = tr.insertCell(0);
        tdName.className = "exhibit-lens-property-name";
        tdName.innerHTML = pair.propertyLabel;
        var cell = tr.insertCell(1);
        cell.className = "exhibit-lens-property-values";
        this._fillCell(pair.propertyID, cell, uiContext);
    }
    div.style.marginBottom = "2em";
    div.style.marginTop = "0.5em";
    div.style.border = "solid";
    div.style.borderWidth = "1";
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
};
Exhibit.EditingLens.prototype._makeEditing = function (itemID, div, uiContext, editMode) {
    var self = this;
    var popup = document.createElement("span");
    popup.className = "exhibit-toolboxWidget-popup screen";
    var editImg = Exhibit.UI.createTranslucentImage("images/edit-icon.png");
    editImg.className = "exhibit-toolboxWidget-button";
    SimileAjax.WindowManager.registerEvent(editImg, "click", function (elmt, evt, target) {
        self._convertLens(itemID, div, uiContext, editMode == 0 ? 1 : 0);
    });
    popup.style.marginTop = editMode == 0 ? 1 : 0;
    popup.style.marginRight = editMode == 0 ? 1 : 0;
    popup.appendChild(editImg);
    var menuBar = document.createElement("div");
    menuBar.style.textAlign = "right";
    if (editMode == ADVANCED_EDITING) {
        menuBar.style.borderBottom = "solid";
        menuBar.style.borderWidth = 1;
    } else {
        menuBar.style.border = "none";
    }
    var toggleButton = document.createElement("span");
    toggleButton.className = "item-edit-button";
    toggleButton.innerHTML = editMode == 0 ? "Edit" : "Done";
    toggleButton.title = editMode == 0 ? "Open editing view." : "Save and return to normal view.";
    SimileAjax.WindowManager.registerEvent(toggleButton, "click", function (elmt, evt, target) {
        self._convertLens(itemID, div, uiContext, editMode == 0 ? 1 : 0);
    });
    var advancedButton = document.createElement("span");
    advancedButton.className = "item-edit-button";
    advancedButton.innerHTML = editMode == 1 ? "Advanced" : "Simple";
    advancedButton.title = editMode == 1 ? "Show advanced view." : "Show simple view.";
    SimileAjax.WindowManager.registerEvent(advancedButton, "click", function (elmt, evt, target) {
        self._convertLens(itemID, div, uiContext, editMode == 1 ? 2 : 1);
    });
    if (editMode == ADVANCED_EDITING) {
        var addButton = document.createElement("span");
        addButton.className = "item-edit-button";
        addButton.innerHTML = "Add value";
        addButton.title = "Add a value to a property.";
        SimileAjax.WindowManager.registerEvent(addButton, "click", function () {
            self._openAddTagMenu(addButton, itemID, uiContext);
        });
        var removeButton = document.createElement("span");
        removeButton.className = "item-edit-button";
        removeButton.innerHTML = "Remove value";
        removeButton.title = "Remove a value from a property.";
        SimileAjax.WindowManager.registerEvent(removeButton, "click", function () {
            self._openRemoveTagMenu(removeButton, itemID, uiContext);
        });
        var revertButton = document.createElement("span");
        revertButton.className = "item-edit-button";
        revertButton.innerHTML = "Revert";
        revertButton.title = "Return to the previous saved state.";
        revertButton.onclick = function () {
            self._revert();
            Exhibit.UI.removeChildren(self._rootNode);
            self._constructEditingLens(itemID, self._rootNode, uiContext);
        };
        var saveButton = document.createElement("span");
        saveButton.className = "item-edit-button";
        saveButton.innerHTML = "Save";
        saveButton.title = "Save the item.";
        saveButton.onclick = function () {
            self._saveFromEditingLens(itemID, self._rootNode, uiContext);
        };
        menuBar.appendChild(addButton);
        menuBar.appendChild(removeButton);
        menuBar.appendChild(revertButton);
        menuBar.appendChild(saveButton);
    }
    if (editMode != NO_EDITING) {
        menuBar.appendChild(advancedButton);
    }
    menuBar.appendChild(toggleButton);
    var target = menuBar;
    for (var i = 0;
         i < div.childNodes.length;
         i++) {
        var temp = div.childNodes[i];
        div.replaceChild(target, temp);
        target = temp;
    }
    div.appendChild(target);
};
Exhibit.EditingLens.prototype._convertLens = function (itemID, div, uiContext, toEditingMode) {
    if (Exhibit.EditingLens.getEditing(itemID, uiContext) == toEditingMode) {
        return;
    }
    Exhibit.EditingLens.setEditing(itemID, toEditingMode, uiContext);
    if (Exhibit.EditingLens.getEditing(itemID, uiContext) == NO_EDITING) {
        this._saveFromEditingLens(itemID, this._rootNode, uiContext);
    }
    Exhibit.UI.removeChildren(div);
    if (toEditingMode == SIMPLE_EDITING) {
        Exhibit.Lens._constructDefaultValueList = Exhibit.EditingLens._constructDefaultValueList;
    } else {
        Exhibit.Lens._constructDefaultValueList = Exhibit.Lens.original_constructDefaultValueList;
    }
    if (toEditingMode == ADVANCED_EDITING) {
        this._constructDefaultUI(itemID, div, uiContext);
    } else {
        this._restore();
    }
};
Exhibit.EditingLens.prototype._constructEditingLens = function (itemID, div, uiContext) {
    this._constructDefaultUI(itemID, div, uiContext);
};
Exhibit.EditingLens.prototype.addButtons = function (itemID, div, uiContext) {
    var self = this;
    var buttons = document.createElement("span");
    buttons.className = "item-edit-buttons";
    var addButton = document.createElement("span");
    addButton.className = "item-edit-button";
    addButton.innerHTML = "Add value";
    SimileAjax.WindowManager.registerEvent(addButton, "click", function () {
        self._openAddTagMenu(addButton, itemID, uiContext);
    });
    var removeButton = document.createElement("span");
    removeButton.className = "item-edit-button";
    removeButton.innerHTML = "Remove value";
    SimileAjax.WindowManager.registerEvent(removeButton, "click", function () {
        self._openRemoveTagMenu(removeButton, itemID, uiContext);
    });
    var revertButton = document.createElement("span");
    revertButton.className = "item-edit-button";
    revertButton.innerHTML = "Revert";
    revertButton.onclick = function () {
        self._revert();
        Exhibit.UI.removeChildren(self._rootNode);
        self._constructEditingLens(itemID, self._rootNode, uiContext);
    };
    var saveButton = document.createElement("span");
    saveButton.className = "item-edit-button";
    saveButton.innerHTML = "Save";
    saveButton.onclick = function () {
        self._saveFromEditingLens(itemID, self._rootNode, uiContext);
    };
    buttons.appendChild(addButton);
    buttons.appendChild(removeButton);
    buttons.appendChild(saveButton);
    buttons.appendChild(revertButton);
    var target = buttons;
    for (var i = 0;
         i < div.childNodes.length;
         i++) {
        var temp = div.childNodes[i];
        div.replaceChild(target, temp);
        target = temp;
    }
    div.appendChild(target);
    div.style.padding = "5px";
};
Exhibit.EditingLens.prototype._getTBody = function () {
    var findTBody = function (node) {
        var dump = null;
        if (node.tagName && node.tagName.toLowerCase() == "tbody") {
            return node;
        } else {
            for (var i = 0;
                 i < node.childNodes.length;
                 i++) {
                var temp = findTBody(node.childNodes[i]);
                if (temp != null) {
                    dump = temp;
                }
            }
        }
        return dump;
    };
    if (this._TBody == null) {
        this._TBody = findTBody(this._rootNode);
    }
    return this._TBody;
};
Exhibit.EditingLens.prototype._saveFromEditingLens = function (itemID, div, uiContext) {
    var self = this;
    this.sync();
    var action = {};
    var oldItemData = this._getItemData();
    action.perform = function () {
        uiContext.getDatabase().reloadItem(itemID, self._itemData);
    };
    action.undo = function () {
        uiContext.getDatabase().reloadItem(itemID, oldItemData);
    };
    action.label = "Changed " + oldItemData["label"][0];
    SimileAjax.History.addAction(action);
};
Exhibit.EditingLens.prototype._fillCell = function (propertyID, cell, uiContext) {
    var self = this;
    var values = this._itemData[propertyID];
    var valueType = uiContext.getDatabase().getProperty(propertyID).getValueType();
    if (valueType == "item") {
        for (var m = 0;
             m < values.length;
             m++) {
            if (m > 0) {
                cell.appendChild(document.createTextNode(", "));
            }
            cell.appendChild(Exhibit.UI.makeEditItemSpan(values[m], null, uiContext, cell.parentNode._toCheck));
        }
    } else {
        for (var m = 0;
             m < values.length;
             m++) {
            this._addRemovableValueSpan(cell, propertyID, m, uiContext, values.length > 1);
        }
        this._addAppendButton(propertyID, cell, uiContext);
    }
};
Exhibit.EditingLens.prototype._addComaSpan = function (propertyID, cell, uiContext, more) {
};
Exhibit.EditingLens.prototype._addAppendButton = function (propertyID, cell, uiContext) {
    var self = this;
    var addImg = Exhibit.UI.createTranslucentImage("images/append-icon2.png");
    addImg.width = 10;
    addImg.height = 10;
    addImg.title = "add new value";
    SimileAjax.WindowManager.registerEvent(addImg, "click", function (elmt, evt, target) {
        self._addValue(propertyID, uiContext);
    });
    cell.appendChild(addImg);
    if (this._itemData[propertyID].length > 1) {
        addImg.className = "shown";
    } else {
        addImg.className = "not-shown";
        var tr = cell.parentNode;
        SimileAjax.WindowManager.registerEvent(tr, "mouseover", function () {
            numChildren = cell.childNodes.length;
            cell.childNodes[numChildren - 1].className = "shown";
            cell.childNodes[numChildren - 2].className = "shown";
            cell.childNodes[numChildren - 3].className = "shown";
        });
        SimileAjax.WindowManager.registerEvent(tr, "mouseout", function () {
            numChildren = cell.childNodes.length;
            cell.childNodes[numChildren - 1].className = "not-shown";
            cell.childNodes[numChildren - 2].className = "not-shown";
            cell.childNodes[numChildren - 3].className = "not-shown";
        });
    }
    cell.appendChild(addImg);
};
Exhibit.EditingLens.prototype.sync = function (propertyID) {
    var TBody = this._getTBody();
    for (var r = 0;
         r < TBody.rows.length;
         r++) {
        var tr = TBody.rows[r];
        if (propertyID == undefined || propertyID == null || Exhibit.getAttribute(tr, "ex:propertyID") == propertyID) {
            var values = [];
            var inputs = Exhibit.UI.findClassMembers("editable-exhibit-value", tr);
            for (var i = 0;
                 i < inputs.length;
                 i++) {
                values.push(inputs[i].value);
            }
            this._itemData[Exhibit.getAttribute(tr, "ex:propertyID")] = values;
            var labels = Exhibit.UI.findClassMembers("exhibit-item", tr);
            for (var i = 0;
                 i < labels.length;
                 i++) {
                values.push(labels[i].innerHTML);
            }
            this._itemData[Exhibit.getAttribute(tr, "ex:propertyID")] = values;
        }
    }
};
Exhibit.EditingLens.prototype._addValue = function (propertyID, uiContext) {
    var TBody = this._getTBody();
    var database = uiContext.getDatabase();
    for (var i = 0;
         i < TBody.rows.length;
         i++) {
        var valueType = database.getProperty(propertyID).getValueType();
        if (Exhibit.getAttribute(this._getTBody().rows[i], "ex:propertyID") == propertyID) {
            var cell = this._getTBody().rows[i].cells[1];
            this.sync(propertyID);
            this._itemData[propertyID].push("");
            Exhibit.UI.removeChildren(cell);
            this._fillCell(propertyID, cell, uiContext);
        }
    }
};
Exhibit.EditingLens.prototype._removeValue = function (propertyID, num, uiContext) {
    var valTBody = this._getTBody();
    var database = uiContext.getDatabase();
    for (var i = 0;
         i < valTBody.rows.length;
         i++) {
        var valueType = database.getProperty(propertyID).getValueType();
        if (Exhibit.getAttribute(valTBody.rows[i], "ex:propertyID") == propertyID) {
            var cell = valTBody.rows[i].cells[1];
            this.sync(propertyID);
            this._itemData[propertyID].splice(num, 1);
            Exhibit.UI.removeChildren(cell);
            this._fillCell(propertyID, cell, uiContext);
        }
    }
};
Exhibit.EditingLens.prototype._openRemoveTagMenu = function (elmt, itemID, uiContext) {
    var self = this;
    this.sync();
    var dom = Exhibit.createPopupMenu(elmt);
    dom.elmt.style.width = "15em";
    dom.appendSectionHeading("Remove property value:");
    var sample = function (text) {
        if (text.length > 20) {
            return text.substr(0, 15) + "...";
        } else {
            return text;
        }
    };
    var pairs = [];
    var propertyIDs = database.getAllProperties();
    for (var i = 0;
         i < propertyIDs.length;
         i++) {
        var propertyID = propertyIDs[i];
        if (propertyID != "uri" && database.countDistinctObjects(itemID, propertyID) > 0) {
            var property = database.getProperty(propertyID);
            pairs.push({propertyID: propertyID, label: property != null ? property.getLabel() : propertyID});
        }
    }
    var makeMenuItem = function (propertyID, label) {
        if (database.getProperty(propertyID).getValueType() == "item") {
            return;
        }
        var subdom = dom.appendSubMenu(label);
        for (var v = 0;
             v < self._itemData[propertyID].length;
             v++) {
            subdom.appendMenuItem(sample(self._itemData[propertyID][v]), null, (function (x) {
                return function () {
                    self._removeValue(propertyID, x, uiContext);
                };
            })(v));
        }
    };
    for (var i = 0;
         i < pairs.length;
         i++) {
        var pair = pairs[i];
        makeMenuItem(pair.propertyID, pair.label);
    }
    dom.open();
};
Exhibit.EditingLens.prototype._openAddTagMenu = function (elmt, itemID, uiContext) {
    var self = this;
    this.sync();
    var database = uiContext.getDatabase();
    var dom = Exhibit.createPopupMenu(elmt);
    dom.appendSectionHeading("Add property value to:");
    var pairs = [];
    var propertyIDs = database.getAllProperties();
    for (var i = 0;
         i < propertyIDs.length;
         i++) {
        var propertyID = propertyIDs[i];
        if (propertyID != "uri" && database.countDistinctObjects(itemID, propertyID) > 0) {
            var property = database.getProperty(propertyID);
            pairs.push({propertyID: propertyID, label: property != null ? property.getLabel() : propertyID});
        }
    }
    var makeMenuItem = function (propertyID, label) {
        var a = dom.makeMenuItem(label, null, function () {
            self._addValue(propertyID, uiContext);
        });
        dom.elmt.appendChild(a);
    };
    for (var i = 0;
         i < pairs.length;
         i++) {
        var pair = pairs[i];
        makeMenuItem(pair.propertyID, pair.label);
    }
    dom.open();
};
Exhibit.EditingLens.prototype._addRemovableValueSpan = function (parentElmt, propertyID, num, layer, showRemoveIcon) {
    var self = this;
    var value = this._itemData[propertyID][num];
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = value;
    parentElmt.appendChild(input);
    var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
    removeImg.style.cursor = "pointer";
    removeImg.width = 10;
    removeImg.height = 10;
    removeImg.style.margin = 0;
    removeImg.title = "remove value";
    SimileAjax.WindowManager.registerEvent(removeImg, "click", function (elmt, evt, target) {
        self._removeValue(propertyID, num, layer);
    });
    parentElmt.appendChild(removeImg);
    var commaSpan = document.createElement("span");
    commaSpan.appendChild(document.createTextNode(", "));
    parentElmt.appendChild(commaSpan);
    if (showRemoveIcon) {
        removeImg.className = "shown";
        commaSpan.className = "shown";
    } else {
        removeImg.className = "not-shown";
        commaSpan.className = "not-shown";
    }
};
Exhibit.EditingLens.prototype._constructFromLensTemplateURL = function (itemID, div, uiContext, lensTemplateURL) {
    Exhibit.Lens.lastItemID = itemID;
    Exhibit.Lens.prototype._constructFromLensTemplateURL(itemID, div, uiContext, lensTemplateURL);
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
};
Exhibit.EditingLens.prototype._constructFromLensTemplateDOM = function (itemID, div, uiContext, lensTemplateNode) {
    Exhibit.Lens.lastItemID = itemID;
    Exhibit.Lens.prototype._constructFromLensTemplateDOM(itemID, div, uiContext, lensTemplateNode);
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
};
Exhibit.EditingLens._constructDefaultValueList = function (values, valueType, parentElmt, uiContext, itemID, propertyID) {
    uiContext.formatList(values, values.size(), valueType, function (elmt) {
        parentElmt.appendChild(elmt);
    }, true);
    parentElmt.className = "editable-exhibit-value";
    SimileAjax.WindowManager.registerEvent(parentElmt, "click", function () {
        if (parentElmt.className != "editing-parent") {
            Exhibit.UI.removeChildren(parentElmt);
            parentElmt.className = "editing-parent";
            values.visit(function (value) {
                Exhibit.EditingLens._addInput(values, value, valueType, parentElmt, uiContext, itemID, propertyID);
            });
            Exhibit.EditingLens._addAppendIcon(values, valueType, parentElmt, uiContext, itemID, propertyID);
            Exhibit.EditingLens._addSaveAndCancelButtons(parentElmt, uiContext, itemID, propertyID, values, valueType);
        }
    });
};
Exhibit.EditingLens._addInput = function (values, value, valueType, parentElmt, uiContext, itemID, propertyID) {
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = value;
    parentElmt.appendChild(input);
    Exhibit.EditingLens._addRemoveIcon(values, valueType, parentElmt, uiContext, itemID, propertyID, value);
    var commaSpan = document.createElement("span");
    commaSpan.appendChild(document.createTextNode(", "));
    parentElmt.appendChild(commaSpan);
};
Exhibit.EditingLens._addRemoveIcon = function (values, valueType, parentElmt, uiContext, itemID, propertyID, value) {
    var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
    removeImg.width = 10;
    removeImg.height = 10;
    removeImg.style.margin = 0;
    removeImg.title = "remove value";
    parentElmt.onclick = "";
    parentElmt.onclick = null;
    SimileAjax.WindowManager.registerEvent(removeImg, "click", function (elmt, evt, target) {
        values.remove(value);
        Exhibit.UI.removeChildren(parentElmt);
        Exhibit.EditingLens._constructDefaultValueList(values, valueType, parentElmt, uiContext, itemID, propertyID);
    });
    parentElmt.appendChild(removeImg);
};
Exhibit.EditingLens._addAppendIcon = function (values, valueType, parentElmt, uiContext, itemID, propertyID) {
    var addImg = Exhibit.UI.createTranslucentImage("images/append-icon2.png");
    addImg.width = 10;
    addImg.height = 10;
    addImg.title = "add new value";
    SimileAjax.WindowManager.registerEvent(addImg, "click", function (elmt, evt, target) {
        values.add("");
        Exhibit.UI.removeChildren(parentElmt);
        Exhibit.EditingLens._constructDefaultValueList(values, valueType, parentElmt, uiContext, itemID, propertyID);
    });
    parentElmt.appendChild(addImg);
};
Exhibit.EditingLens.makeButton = function (label, handler) {
    var addButton = document.createElement("span");
    addButton.className = "item-edit-button";
    addButton.innerHTML = label;
    SimileAjax.WindowManager.registerEvent(addButton, "click", handler);
    return addButton;
};
Exhibit.EditingLens._addSaveAndCancelButtons = function (propertyBox, uiContext, itemID, propertyID, values, valueType) {
    var save = function () {
        var inputs = Exhibit.UI.findClassMembers("editable-exhibit-value", propertyBox);
        var values = [];
        for (var i = 0;
             i < inputs.length;
             i++) {
            values.push(inputs[i].value);
        }
        itemEntry = {};
        itemEntry[propertyID] = values;
        itemEntry["id"] = itemID;
        uiContext.getDatabase().reloadItem(itemID, itemEntry);
    };
    var redraw = function () {
        Exhibit.UI.removeChildren(propertyBox);
        Exhibit.EditingLens._constructDefaultValueList(values, valueType, propertyBox, uiContext, itemID, propertyID);
    };
    var saveAndRedraw = function () {
        save();
        redraw();
    };
    var saveButton = Exhibit.EditingLens.makeButton("Save", saveAndRedraw);
    var cancelButton = Exhibit.EditingLens.makeButton("Cancel", redraw);
    propertyBox.appendChild(saveButton);
    propertyBox.appendChild(cancelButton);
};
Exhibit.UIContext.prototype.format = function (value, valueType, appender, editing) {
    var f;
    if (valueType in this._formatters) {
        f = this._formatters[valueType];
    } else {
        f = this._formatters[valueType] = new Exhibit.Formatter._constructors[valueType](this);
    }
    f.format(value, appender, editing);
};
Exhibit.UIContext.prototype.formatList = function (iterator, count, valueType, appender, editing) {
    if (this._listFormatter == null) {
        this._listFormatter = new Exhibit.Formatter._ListFormatter(this);
    }
    this._listFormatter.formatList(iterator, count, valueType, appender, editing);
};


/* lens.js */
Exhibit.LensRegistry.prototype.createLens = function (itemID, div, uiContext, editing) {
    var lensTemplate = this.getLens(itemID, uiContext);
    var create = function (ilens) {
        if (lensTemplate == null) {
            ilens._constructDefaultUI(itemID, div, uiContext);
        } else {
            if (typeof lensTemplate == "string") {
                ilens._constructFromLensTemplateURL(itemID, div, uiContext, lensTemplate);
            } else {
                ilens._constructFromLensTemplateDOM(itemID, div, uiContext, lensTemplate);
            }
        }
    };
    var lens = {};
    try {
        if (editing) {
            lens = Exhibit.EditingLens.create(itemID, div, uiContext, lens, create);
        } else {
            lens = new Exhibit.Lens();
        }
    } catch (e) {
        SimileAjax.Debug.warn("Something wrong happened while building the editing lens, reverting to regular lens.");
        lens = new Exhibit.Lens();
    }
    create(lens);
    if (editing) {
        var walk = function (a, b) {
            if (Exhibit.getAttribute(a, "ex:content") != null) {
                Exhibit.setAttribute(b, "ex:content", Exhibit.getAttributes(a, "ex:content"));
            } else {
                for (var i = 0;
                     i < a.childNodes.length;
                     i++) {
                    walk(a.childNodes[i], b.childNodes[i]);
                }
            }
        };
    }
    return lens;
};
Exhibit.Lens._constructFromLensTemplateNode = function (roots, rootValueTypes, templateNode, parentElmt, uiContext, job) {
    if (typeof templateNode == "string") {
        parentElmt.appendChild(document.createTextNode(templateNode));
        return;
    }
    var database = uiContext.getDatabase();
    var children = templateNode.children;
    if (templateNode.condition != null) {
        if (templateNode.condition.test == "if-exists") {
            if (!templateNode.condition.expression.testExists(roots, rootValueTypes, "value", database)) {
                return;
            }
        } else {
            if (templateNode.condition.test == "if") {
                if (templateNode.condition.expression.evaluate(roots, rootValueTypes, "value", database).values.contains(true)) {
                    if (children != null && children.length > 0) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[0], parentElmt, uiContext, job);
                    }
                } else {
                    if (children != null && children.length > 1) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[1], parentElmt, uiContext, job);
                    }
                }
                return;
            } else {
                if (templateNode.condition.test == "select") {
                    var values = templateNode.condition.expression.evaluate(roots, rootValueTypes, "value", database).values;
                    if (children != null) {
                        var lastChildTemplateNode = null;
                        for (var c = 0;
                             c < children.length;
                             c++) {
                            var childTemplateNode = children[c];
                            if (childTemplateNode.condition != null && childTemplateNode.condition.test == "case") {
                                if (values.contains(childTemplateNode.condition.value)) {
                                    Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, childTemplateNode, parentElmt, uiContext, job);
                                    return;
                                }
                            } else {
                                if (typeof childTemplateNode != "string") {
                                    lastChildTemplateNode = childTemplateNode;
                                }
                            }
                        }
                    }
                    if (lastChildTemplateNode != null) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, lastChildTemplateNode, parentElmt, uiContext, job);
                    }
                    return;
                }
            }
        }
    }
    var elmt = Exhibit.Lens._constructElmtWithAttributes(templateNode, parentElmt, database);
    if (templateNode.contentAttributes != null) {
        var contentAttributes = templateNode.contentAttributes;
        for (var i = 0;
             i < contentAttributes.length;
             i++) {
            var attribute = contentAttributes[i];
            var values = [];
            attribute.expression.evaluate(roots, rootValueTypes, "value", database).values.visit(function (v) {
                values.push(v);
            });
            elmt.setAttribute(attribute.name, values.join(";"));
        }
    }
    if (templateNode.subcontentAttributes != null) {
        var subcontentAttributes = templateNode.subcontentAttributes;
        for (var i = 0;
             i < subcontentAttributes.length;
             i++) {
            var attribute = subcontentAttributes[i];
            var fragments = attribute.fragments;
            var results = "";
            for (var r = 0;
                 r < fragments.length;
                 r++) {
                var fragment = fragments[r];
                if (typeof fragment == "string") {
                    results += fragment;
                } else {
                    results += fragment.evaluateSingle(roots, rootValueTypes, "value", database).value;
                }
            }
            elmt.setAttribute(attribute.name, results);
        }
    }
    var handlers = templateNode.handlers;
    for (var h = 0;
         h < handlers.length;
         h++) {
        var handler = handlers[h];
        elmt[handler.name] = handler.code;
    }
    if (templateNode.control != null) {
        switch (templateNode.control) {
            case"item-link":
                var a = document.createElement("a");
                a.innerHTML = Exhibit.l10n.itemLinkLabel;
                a.href = Exhibit.Persistence.getItemLink(roots["value"]);
                a.target = "_blank";
                elmt.appendChild(a);
        }
    } else {
        if (templateNode.content != null) {
            var results = templateNode.content.evaluate(roots, rootValueTypes, "value", database);
            if (children != null) {
                var rootValueTypes2 = {"value": results.valueType, "index": "number"};
                var index = 1;
                var processOneValue = function (childValue) {
                    var roots2 = {"value": childValue, "index": index++};
                    for (var i = 0;
                         i < children.length;
                         i++) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots2, rootValueTypes2, children[i], elmt, uiContext, job);
                    }
                };
                if (results.values instanceof Array) {
                    for (var i = 0;
                         i < results.values.length;
                         i++) {
                        processOneValue(results.values[i]);
                    }
                } else {
                    results.values.visit(processOneValue);
                }
            } else {
                Exhibit.Lens._constructDefaultValueList(results.values, results.valueType, elmt, uiContext, job.itemID, templateNode.content._rootNode._segments[0].property);
            }
        } else {
            if (children != null) {
                for (var i = 0;
                     i < children.length;
                     i++) {
                    Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[i], elmt, uiContext, job);
                }
            }
        }
    }
};
Exhibit.Lens.original_constructDefaultValueList = Exhibit.Lens._constructDefaultValueList;
