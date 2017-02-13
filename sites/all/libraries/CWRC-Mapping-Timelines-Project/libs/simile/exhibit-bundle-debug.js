﻿/* authentication.js */
Exhibit.Authentication = {};
Exhibit.Authentication.Enabled = false;
Exhibit.Authentication.GoogleToken = null;
Exhibit.Authentication.GoogleSessionToken = null;
Exhibit.Authentication.authenticate = function () {
    if (!window.Exhibit.params.authenticated) {
        return;
    }
    var links = document.getElementsByTagName("head")[0].childNodes;
    for (var i = 0;
         i < links.length;
         i++) {
        var link = links[i];
        if (link.rel == "exhibit/output" && link.getAttribute("ex:authenticated")) {
            Exhibit.Authentication.handleGoogleAuthentication();
            return;
        }
    }
};
Exhibit.Authentication.parseLocationParams = function () {
    var params = document.location.search.substr(1).split("&");
    var ret = {};
    for (var i = 0;
         i < params.length;
         i++) {
        var p = params[i];
        if (p.indexOf("=") != -1) {
            var components = p.split("=");
            if (components.length != 2) {
                SimileAjax.Debug.warn("Error parsing location parameter " + p);
            } else {
                ret[components[0]] = components[1];
            }
        } else {
            ret[p] = true;
        }
    }
    return ret;
};
Exhibit.Authentication.GoogleAuthenticationURL = "https://www.google.com/accounts/AuthSubRequest";
Exhibit.Authentication.handleGoogleAuthentication = function () {
    var params = Exhibit.Authentication.parseLocationParams();
    if (params.token) {
        Exhibit.Authentication.GoogleToken = params.token;
        Exhibit.Authentication.Enabled = true;
    } else {
        var authURL = Exhibit.Authentication.GoogleAuthenticationURL;
        authURL += "?session=1";
        authURL += "&scope=http://spreadsheets.google.com/feeds/";
        authURL += "&next=" + document.location.href;
        document.location.href = authURL;
    }
};


/* collection.js */
Exhibit.Collection = function (id, database) {
    this._id = id;
    this._database = database;
    this._listeners = new SimileAjax.ListenerQueue();
    this._facets = [];
    this._updating = false;
    this._items = null;
    this._restrictedItems = null;
};
Exhibit.Collection.createAllItemsCollection = function (id, database) {
    var collection = new Exhibit.Collection(id, database);
    collection._update = Exhibit.Collection._allItemsCollection_update;
    Exhibit.Collection._initializeBasicCollection(collection, database);
    return collection;
};
Exhibit.Collection.createSubmissionsCollection = function (id, database) {
    var collection = new Exhibit.Collection(id, database);
    collection._update = Exhibit.Collection._submissionCollection_update;
    Exhibit.Collection._initializeBasicCollection(collection, database);
    return collection;
};
Exhibit.Collection.create = function (id, configuration, database) {
    var collection = new Exhibit.Collection(id, database);
    if ("itemTypes" in configuration) {
        collection._itemTypes = configuration.itemTypes;
        collection._update = Exhibit.Collection._typeBasedCollection_update;
    } else {
        collection._update = Exhibit.Collection._allItemsCollection_update;
    }
    Exhibit.Collection._initializeBasicCollection(collection, database);
    return collection;
};
Exhibit.Collection.createFromDOM = function (id, elmt, database) {
    var collection = new Exhibit.Collection(id, database);
    var itemTypes = Exhibit.getAttribute(elmt, "itemTypes", ",");
    if (itemTypes != null && itemTypes.length > 0) {
        collection._itemTypes = itemTypes;
        collection._update = Exhibit.Collection._typeBasedCollection_update;
    } else {
        collection._update = Exhibit.Collection._allItemsCollection_update;
    }
    Exhibit.Collection._initializeBasicCollection(collection, database);
    return collection;
};
Exhibit.Collection.create2 = function (id, configuration, uiContext) {
    var database = uiContext.getDatabase();
    if ("expression" in configuration) {
        var collection = new Exhibit.Collection(id, database);
        collection._expression = Exhibit.ExpressionParser.parse(configuration.expression);
        collection._baseCollection = ("baseCollectionID" in configuration) ? uiContext.getExhibit().getCollection(configuration.baseCollectionID) : uiContext.getCollection();
        collection._restrictBaseCollection = ("restrictBaseCollection" in configuration) ? configuration.restrictBaseCollection : false;
        if (collection._restrictBaseCollection) {
            Exhibit.Collection._initializeRestrictingBasedCollection(collection);
        } else {
            Exhibit.Collection._initializeBasedCollection(collection);
        }
        return collection;
    } else {
        return Exhibit.Collection.create(id, configuration, database);
    }
};
Exhibit.Collection.createFromDOM2 = function (id, elmt, uiContext) {
    var database = uiContext.getDatabase();
    var collection;
    if (Exhibit.getAttribute(elmt, "submissionsCollection")) {
        return Exhibit.Collection.createSubmissionsCollection(id, database);
    }
    var expressionString = Exhibit.getAttribute(elmt, "expression");
    if (expressionString != null && expressionString.length > 0) {
        collection = new Exhibit.Collection(id, database);
        collection._expression = Exhibit.ExpressionParser.parse(expressionString);
        var baseCollectionID = Exhibit.getAttribute(elmt, "baseCollectionID");
        collection._baseCollection = (baseCollectionID != null && baseCollectionID.length > 0) ? uiContext.getExhibit().getCollection(baseCollectionID) : uiContext.getCollection();
        collection._restrictBaseCollection = Exhibit.getAttribute(elmt, "restrictBaseCollection") == "true";
        if (collection._restrictBaseCollection) {
            Exhibit.Collection._initializeRestrictingBasedCollection(collection, database);
        } else {
            Exhibit.Collection._initializeBasedCollection(collection);
        }
    } else {
        collection = Exhibit.Collection.createFromDOM(id, elmt, database);
    }
    return collection;
};
Exhibit.Collection._initializeBasicCollection = function (collection, database) {
    var update = function () {
        collection._update();
    };
    collection._listener = {onAfterLoadingItems: update, onAfterRemovingAllStatements: update};
    database.addListener(collection._listener);
    collection._update();
};
Exhibit.Collection._initializeBasedCollection = function (collection) {
    collection._update = Exhibit.Collection._basedCollection_update;
    collection._listener = {onItemsChanged: function () {
        collection._update();
    }};
    collection._baseCollection.addListener(collection._listener);
    collection._update();
};
Exhibit.Collection._initializeRestrictingBasedCollection = function (collection, database) {
    collection._cache = new Exhibit.FacetUtilities.Cache(database, collection._baseCollection, collection._expression);
    collection._isUpdatingBaseCollection = false;
    collection.onFacetUpdated = Exhibit.Collection._restrictingBasedCollection_onFacetUpdated;
    collection.restrict = Exhibit.Collection._restrictingBasedCollection_restrict;
    collection.update = Exhibit.Collection._restrictingBasedCollection_update;
    collection.hasRestrictions = Exhibit.Collection._restrictingBasedCollection_hasRestrictions;
    collection._baseCollection.addFacet(collection);
};
Exhibit.Collection._allItemsCollection_update = function () {
    this.setItems(this._database.getAllItems());
    this._onRootItemsChanged();
};
Exhibit.Collection._submissionCollection_update = function () {
    this.setItems(this._database.getAllSubmissions());
    this._onRootItemsChanged();
};
Exhibit.Collection._typeBasedCollection_update = function () {
    var newItems = new Exhibit.Set();
    for (var i = 0;
         i < this._itemTypes.length;
         i++) {
        this._database.getSubjects(this._itemTypes[i], "type", newItems);
    }
    this.setItems(newItems);
    this._onRootItemsChanged();
};
Exhibit.Collection._basedCollection_update = function () {
    this.setItems(this._expression.evaluate({"value": this._baseCollection.getRestrictedItems()}, {"value": "item"}, "value", this._database).values);
    this._onRootItemsChanged();
};
Exhibit.Collection._restrictingBasedCollection_onFacetUpdated = function (facetChanged) {
    if (!this._updating) {
        Exhibit.Collection.prototype.onFacetUpdated.call(this, facetChanged);
        this._isUpdatingBaseCollection = true;
        this._baseCollection.onFacetUpdated(this);
        this._isUpdatingBaseCollection = false;
    }
};
Exhibit.Collection._restrictingBasedCollection_restrict = function (items) {
    if (this._restrictedItems.size() == this._items.size()) {
        return items;
    }
    return this._cache.getItemsFromValues(this._restrictedItems, items);
};
Exhibit.Collection._restrictingBasedCollection_update = function (items) {
    if (!this._isUpdatingBaseCollection) {
        this.setItems(this._cache.getValuesFromItems(items));
        this._onRootItemsChanged();
    }
};
Exhibit.Collection._restrictingBasedCollection_hasRestrictions = function () {
    return(this._items != null) && (this._restrictedItems != null) && (this._restrictedItems.size() != this._items.size());
};
Exhibit.Collection.prototype.getID = function () {
    return this._id;
};
Exhibit.Collection.prototype.dispose = function () {
    if ("_baseCollection" in this) {
        this._baseCollection.removeListener(this._listener);
        this._baseCollection = null;
        this._expression = null;
    } else {
        this._database.removeListener(this._listener);
    }
    this._database = null;
    this._listener = null;
    this._listeners = null;
    this._items = null;
    this._restrictedItems = null;
};
Exhibit.Collection.prototype.addListener = function (listener) {
    this._listeners.add(listener);
};
Exhibit.Collection.prototype.removeListener = function (listener) {
    this._listeners.remove(listener);
};
Exhibit.Collection.prototype.addFacet = function (facet) {
    this._facets.push(facet);
    if (facet.hasRestrictions()) {
        this._computeRestrictedItems();
        this._updateFacets(null);
        this._listeners.fire("onItemsChanged", []);
    } else {
        facet.update(this.getRestrictedItems());
    }
};
Exhibit.Collection.prototype.removeFacet = function (facet) {
    for (var i = 0;
         i < this._facets.length;
         i++) {
        if (facet == this._facets[i]) {
            this._facets.splice(i, 1);
            if (facet.hasRestrictions()) {
                this._computeRestrictedItems();
                this._updateFacets(null);
                this._listeners.fire("onItemsChanged", []);
            }
            break;
        }
    }
};
Exhibit.Collection.prototype.clearAllRestrictions = function () {
    var restrictions = [];
    this._updating = true;
    for (var i = 0;
         i < this._facets.length;
         i++) {
        restrictions.push(this._facets[i].clearAllRestrictions());
    }
    this._updating = false;
    this.onFacetUpdated(null);
    return restrictions;
};
Exhibit.Collection.prototype.applyRestrictions = function (restrictions) {
    this._updating = true;
    for (var i = 0;
         i < this._facets.length;
         i++) {
        this._facets[i].applyRestrictions(restrictions[i]);
    }
    this._updating = false;
    this.onFacetUpdated(null);
};
Exhibit.Collection.prototype.getAllItems = function () {
    return new Exhibit.Set(this._items);
};
Exhibit.Collection.prototype.countAllItems = function () {
    return this._items.size();
};
Exhibit.Collection.prototype.getRestrictedItems = function () {
    return new Exhibit.Set(this._restrictedItems);
};
Exhibit.Collection.prototype.countRestrictedItems = function () {
    return this._restrictedItems.size();
};
Exhibit.Collection.prototype.onFacetUpdated = function (facetChanged) {
    if (!this._updating) {
        this._computeRestrictedItems();
        this._updateFacets(facetChanged);
        this._listeners.fire("onItemsChanged", []);
    }
};
Exhibit.Collection.prototype._onRootItemsChanged = function () {
    this._listeners.fire("onRootItemsChanged", []);
    this._computeRestrictedItems();
    this._updateFacets(null);
    this._listeners.fire("onItemsChanged", []);
};
Exhibit.Collection.prototype._updateFacets = function (facetChanged) {
    var restrictedFacetCount = 0;
    for (var i = 0;
         i < this._facets.length;
         i++) {
        if (this._facets[i].hasRestrictions()) {
            restrictedFacetCount++;
        }
    }
    for (var i = 0;
         i < this._facets.length;
         i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            if (restrictedFacetCount <= 1) {
                facet.update(this.getAllItems());
            } else {
                var items = this.getAllItems();
                for (var j = 0;
                     j < this._facets.length;
                     j++) {
                    if (i != j) {
                        items = this._facets[j].restrict(items);
                    }
                }
                facet.update(items);
            }
        } else {
            facet.update(this.getRestrictedItems());
        }
    }
};
Exhibit.Collection.prototype._computeRestrictedItems = function () {
    this._restrictedItems = this._items;
    for (var i = 0;
         i < this._facets.length;
         i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            this._restrictedItems = facet.restrict(this._restrictedItems);
        }
    }
};
Exhibit.Collection.prototype.setItems = function (items) {
    this._items = items;
};


/* controls.js */
Exhibit.Controls = {};
Exhibit.Controls["if"] = {f: function (args, roots, rootValueTypes, defaultRootName, database) {
    var conditionCollection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
    var condition = false;
    conditionCollection.forEachValue(function (v) {
        if (v) {
            condition = true;
            return true;
        }
    });
    if (condition) {
        return args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
    } else {
        return args[2].evaluate(roots, rootValueTypes, defaultRootName, database);
    }
}};
Exhibit.Controls["foreach"] = {f: function (args, roots, rootValueTypes, defaultRootName, database) {
    var collection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
    var oldValue = roots["value"];
    var oldValueType = rootValueTypes["value"];
    rootValueTypes["value"] = collection.valueType;
    var results = [];
    var valueType = "text";
    collection.forEachValue(function (element) {
        roots["value"] = element;
        var collection2 = args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
        valueType = collection2.valueType;
        collection2.forEachValue(function (result) {
            results.push(result);
        });
    });
    roots["value"] = oldValue;
    rootValueTypes["value"] = oldValueType;
    return new Exhibit.Expression._Collection(results, valueType);
}};
Exhibit.Controls["default"] = {f: function (args, roots, rootValueTypes, defaultRootName, database) {
    for (var i = 0;
         i < args.length;
         i++) {
        var collection = args[i].evaluate(roots, rootValueTypes, defaultRootName, database);
        if (collection.size > 0) {
            return collection;
        }
    }
    return new Exhibit.Expression._Collection([], "text");
}};
Exhibit.Controls["filter"] = {f: function (args, roots, rootValueTypes, defaultRootName, database) {
    var collection = args[0].evaluate(roots, rootValueTypes, defaultRootName, database);
    var oldValue = roots["value"];
    var oldValueType = rootValueTypes["value"];
    var results = new Exhibit.Set();
    rootValueTypes["value"] = collection.valueType;
    collection.forEachValue(function (element) {
        roots["value"] = element;
        var collection2 = args[1].evaluate(roots, rootValueTypes, defaultRootName, database);
        if (collection2.size > 0 && collection2.contains("true")) {
            results.add(element);
        }
    });
    roots["value"] = oldValue;
    rootValueTypes["value"] = oldValueType;
    return new Exhibit.Expression._Collection(results, collection.valueType);
}};


/* database.js */
Exhibit.Database = new Object();
Exhibit.Database.create = function () {
    Exhibit.Database.handleAuthentication();
    return new Exhibit.Database._Impl();
};
Exhibit.Database.handleAuthentication = function () {
    if (window.Exhibit.params.authenticated) {
        var links = document.getElementsByTagName("head")[0].childNodes;
        for (var i = 0;
             i < links.length;
             i++) {
            var link = links[i];
            if (link.rel == "exhibit/output" && link.getAttribute("ex:authenticated")) {
            }
        }
    }
};
Exhibit.Database.makeISO8601DateString = function (date) {
    date = date || new Date();
    var pad = function (i) {
        return i > 9 ? i.toString() : "0" + i;
    };
    var s = date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    return s;
};
Exhibit.Database.TimestampPropertyName = "addedOn";
Exhibit.Database._Impl = function () {
    this._types = {};
    this._properties = {};
    this._propertyArray = {};
    this._submissionRegistry = {};
    this._originalValues = {};
    this._newItems = {};
    this._listeners = new SimileAjax.ListenerQueue();
    this._spo = {};
    this._ops = {};
    this._items = new Exhibit.Set();
    var l10n = Exhibit.Database.l10n;
    var itemType = new Exhibit.Database._Type("Item");
    itemType._custom = Exhibit.Database.l10n.itemType;
    this._types["Item"] = itemType;
    var labelProperty = new Exhibit.Database._Property("label", this);
    labelProperty._uri = "http://www.w3.org/2000/01/rdf-schema#label";
    labelProperty._valueType = "text";
    labelProperty._label = l10n.labelProperty.label;
    labelProperty._pluralLabel = l10n.labelProperty.pluralLabel;
    labelProperty._reverseLabel = l10n.labelProperty.reverseLabel;
    labelProperty._reversePluralLabel = l10n.labelProperty.reversePluralLabel;
    labelProperty._groupingLabel = l10n.labelProperty.groupingLabel;
    labelProperty._reverseGroupingLabel = l10n.labelProperty.reverseGroupingLabel;
    this._properties["label"] = labelProperty;
    var typeProperty = new Exhibit.Database._Property("type");
    typeProperty._uri = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    typeProperty._valueType = "text";
    typeProperty._label = "type";
    typeProperty._pluralLabel = l10n.typeProperty.label;
    typeProperty._reverseLabel = l10n.typeProperty.reverseLabel;
    typeProperty._reversePluralLabel = l10n.typeProperty.reversePluralLabel;
    typeProperty._groupingLabel = l10n.typeProperty.groupingLabel;
    typeProperty._reverseGroupingLabel = l10n.typeProperty.reverseGroupingLabel;
    this._properties["type"] = typeProperty;
    var uriProperty = new Exhibit.Database._Property("uri");
    uriProperty._uri = "http://simile.mit.edu/2006/11/exhibit#uri";
    uriProperty._valueType = "url";
    uriProperty._label = "URI";
    uriProperty._pluralLabel = "URIs";
    uriProperty._reverseLabel = "URI of";
    uriProperty._reversePluralLabel = "URIs of";
    uriProperty._groupingLabel = "URIs";
    uriProperty._reverseGroupingLabel = "things named by these URIs";
    this._properties["uri"] = uriProperty;
    var changeProperty = new Exhibit.Database._Property("change", this);
    changeProperty._uri = "http://simile.mit.edu/2006/11/exhibit#change";
    changeProperty._valueType = "text";
    changeProperty._label = "change type";
    changeProperty._pluralLabel = "change types";
    changeProperty._reverseLabel = "change type of";
    changeProperty._reversePluralLabel = "change types of";
    changeProperty._groupingLabel = "change types";
    changeProperty._reverseGroupingLabel = "changes of this type";
    this._properties["change"] = changeProperty;
    var changedItemProperty = new Exhibit.Database._Property("changedItem", this);
    changedItemProperty._uri = "http://simile.mit.edu/2006/11/exhibit#changedItem";
    changedItemProperty._valueType = "text";
    changedItemProperty._label = "changed item";
    changedItemProperty._pluralLabel = "changed item";
    changedItemProperty._groupingLabel = "changed items";
    this._properties["changedItem"] = changedItemProperty;
    var modifiedProperty = new Exhibit.Database._Property(Exhibit.Database.ModifiedPropertyName, this);
    modifiedProperty._uri = "http://simile.mit.edu/2006/11/exhibit#modified";
    modifiedProperty._valueType = "text";
    modifiedProperty._label = "modified";
    modifiedProperty._pluralLabel = "modified";
    modifiedProperty._groupingLabel = "was modified";
    this._properties["modified"] = modifiedProperty;
};
Exhibit.Database._Impl.prototype.createDatabase = function () {
    return Exhibit.Database.create();
};
Exhibit.Database._Impl.prototype.addListener = function (listener) {
    this._listeners.add(listener);
};
Exhibit.Database._Impl.prototype.removeListener = function (listener) {
    this._listeners.remove(listener);
};
Exhibit.Database._Impl.prototype.loadDataLinks = function (fDone) {
    var links = SimileAjax.jQuery('link[rel="exhibit/data"]').add('a[rel="exhibit/data"]').get();
    var self = this;
    var fDone2 = function () {
        self.loadDataElements(self, fDone);
        if (fDone) {
            fDone();
        }
    };
    this._loadLinks(links, this, fDone2);
};
Exhibit.Database._Impl.prototype.loadLinks = function (links, fDone) {
    this._loadLinks(links, this, fDone);
};
Exhibit.Database._Impl.prototype.loadDataElements = function (database) {
    var findFunction = function (s) {
        if (typeof (s) == "string") {
            if (s in Exhibit) {
                s = Exhibit[s];
            } else {
                try {
                    s = eval(s);
                } catch (e) {
                    s = null;
                }
            }
        }
        return s;
    };
    var url = window.location.href;
    var loadElement = function (element) {
        var e = SimileAjax.jQuery(element);
        var content = e.html();
        if (content) {
            if (!e.attr("href")) {
                e.attr("href", url);
            }
            var type = Exhibit.getAttribute(element, "type");
            if (type == null || type.length == 0) {
                type = "application/json";
            }
            var importer = Exhibit.importers[type];
            var parser = findFunction(Exhibit.getAttribute(element, "parser")) || (importer && importer.parse);
            if (parser) {
                var o = null;
                try {
                    o = parser(content, element, url);
                } catch (e) {
                    SimileAjax.Debug.exception(e, "Error parsing Exhibit data from " + url);
                }
                if (o != null) {
                    try {
                        database.loadData(o, Exhibit.Persistence.getBaseURL(url));
                        e.hide();
                    } catch (e) {
                        SimileAjax.Debug.exception(e, "Error loading Exhibit data from " + url);
                    }
                }
            } else {
                SimileAjax.Debug.log("No parser for data of type " + type);
            }
        }
    };
    var safeLoadElement = function () {
        try {
            loadElement(this);
        } catch (e) {
        }
    };
    var elements;
    try {
        elements = SimileAjax.jQuery('[ex\\:role="data"]');
    } catch (e) {
        elements = $("*").filter(function () {
            var attrs = this.attributes;
            for (i = 0;
                 i < attrs.length;
                 i++) {
                if ((attrs[i].nodeName == "ex:role") && (attrs[i].nodeValue == "data")) {
                    return true;
                }
            }
            return false;
        });
    }
    elements.each(safeLoadElement);
};
Exhibit.Database._Impl.prototype.loadSubmissionLinks = function (fDone) {
    var db = this;
    var dbProxy = {loadData: function (o, baseURI) {
        if ("types" in o) {
            db.loadTypes(o.types, baseURI);
        }
        if ("properties" in o) {
            db.loadProperties(o.properties, baseURI);
        }
        if ("items" in o) {
            db._listeners.fire("onBeforeLoadingItems", []);
            db.loadItems(o.items, baseURI);
            db._listeners.fire("onAfterLoadingItems", []);
        }
    }};
    var links = SimileAjax.jQuery("head > link[rel=exhibit/submissions]").get();
    this._loadLinks(links, dbProxy, fDone);
};
Exhibit.Database._Impl.defaultGetter = function (link, database, parser, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);
    var fError = function () {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) {
            cont();
        }
    };
    var fDone = function (content) {
        Exhibit.UI.hideBusyIndicator();
        if (url.indexOf("#") >= 0) {
            var fragment = url.match(/(#.*)/)[1];
            content = SimileAjax.jQuery("<div>" + content + "</div>").find(fragment).html();
        }
        var o;
        try {
            o = parser(content, link, url);
        } catch (e) {
            SimileAjax.Debug.log(e, "Error parsing Exhibit data from " + url);
        }
        if (o != null) {
            try {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            } catch (e) {
                SimileAjax.Debug.log(e, "Error loading Exhibit data from " + url);
            }
        }
        if (cont) {
            cont();
        }
    };
    Exhibit.UI.showBusyIndicator();
    SimileAjax.jQuery.ajax({url: url, dataType: "text", success: fDone, error: fError});
};
Exhibit.Database._Impl.prototype.findLoader = function (elt) {
    var findFunction = function (s) {
        if (typeof (s) == "string") {
            if (s in Exhibit) {
                s = Exhibit[s];
            } else {
                try {
                    s = eval(s);
                } catch (e) {
                    s = null;
                }
            }
        }
        return s;
    };
    var type = Exhibit.getAttribute(link, "type");
    if (type == null || type.length == 0) {
        type = "application/json";
    }
    var importer = Exhibit.importers[type];
    var parser = findFunction(Exhibit.getAttribute(link, "parser")) || (importer && importer.parse);
    var getter = findFunction(Exhibit.getAttribute(link, "getter")) || (importer && importer.getter) || Exhibit.Database._Impl.defaultGetter;
    if (parser) {
        return function (link, database, fNext) {
            (getter)(link, database, parser, fNext);
        };
    } else {
        if (importer) {
            return importer.load;
        } else {
            return null;
        }
    }
};
Exhibit.Database._Impl.prototype._loadLinks = function (links, database, fDone) {
    var findFunction = function (s) {
        if (typeof (s) == "string") {
            if (s in Exhibit) {
                s = Exhibit[s];
            } else {
                try {
                    s = eval(s);
                } catch (e) {
                    s = null;
                }
            }
        }
        return s;
    };
    links = [].concat(links);
    var fNext = function () {
        while (links.length > 0) {
            var link = links.shift();
            var type = link.type;
            if (type == null || type.length == 0) {
                type = "application/json";
            }
            var importer = Exhibit.importers[type];
            var parser = findFunction(Exhibit.getAttribute(link, "parser")) || (importer && importer.parse);
            var getter = findFunction(Exhibit.getAttribute(link, "getter")) || (importer && importer.getter) || Exhibit.Database._Impl.defaultGetter;
            if (parser) {
                (getter)(link, database, parser, fNext);
                return;
            } else {
                if (importer) {
                    importer.load(link, database, fNext);
                    return;
                } else {
                    SimileAjax.Debug.log("No importer for data of type " + type);
                }
            }
        }
        if (fDone != null) {
            fDone();
        }
    };
    fNext();
};
Exhibit.Database._Impl.prototype.loadData = function (o, baseURI) {
    if (typeof baseURI == "undefined") {
        baseURI = location.href;
    }
    if ("types" in o) {
        this.loadTypes(o.types, baseURI);
    }
    if ("properties" in o) {
        this.loadProperties(o.properties, baseURI);
    }
    if ("items" in o) {
        this.loadItems(o.items, baseURI);
    }
};
Exhibit.Database._Impl.prototype.loadTypes = function (typeEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingTypes", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else {
            if (lastChar != "/" && lastChar != ":") {
                baseURI += "/";
            }
        }
        for (var typeID in typeEntries) {
            if (typeof typeID != "string") {
                continue;
            }
            var typeEntry = typeEntries[typeID];
            if (typeof typeEntry != "object") {
                continue;
            }
            var type;
            if (typeID in this._types) {
                type = this._types[typeID];
            } else {
                type = new Exhibit.Database._Type(typeID);
                this._types[typeID] = type;
            }
            for (var p in typeEntry) {
                type._custom[p] = typeEntry[p];
            }
            if (!("uri" in type._custom)) {
                type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
            }
            if (!("label" in type._custom)) {
                type._custom["label"] = typeID;
            }
        }
        this._listeners.fire("onAfterLoadingTypes", []);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Database.loadTypes failed");
    }
};
Exhibit.Database._Impl.prototype.loadProperties = function (propertyEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingProperties", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else {
            if (lastChar != "/" && lastChar != ":") {
                baseURI += "/";
            }
        }
        for (var propertyID in propertyEntries) {
            if (typeof propertyID != "string") {
                continue;
            }
            var propertyEntry = propertyEntries[propertyID];
            if (typeof propertyEntry != "object") {
                continue;
            }
            var property;
            if (propertyID in this._properties) {
                property = this._properties[propertyID];
            } else {
                property = new Exhibit.Database._Property(propertyID, this);
                this._properties[propertyID] = property;
            }
            property._uri = ("uri" in propertyEntry) ? propertyEntry.uri : (baseURI + "property#" + encodeURIComponent(propertyID));
            property._valueType = ("valueType" in propertyEntry) ? propertyEntry.valueType : "text";
            property._label = ("label" in propertyEntry) ? propertyEntry.label : propertyID;
            property._pluralLabel = ("pluralLabel" in propertyEntry) ? propertyEntry.pluralLabel : property._label;
            property._reverseLabel = ("reverseLabel" in propertyEntry) ? propertyEntry.reverseLabel : ("!" + property._label);
            property._reversePluralLabel = ("reversePluralLabel" in propertyEntry) ? propertyEntry.reversePluralLabel : ("!" + property._pluralLabel);
            property._groupingLabel = ("groupingLabel" in propertyEntry) ? propertyEntry.groupingLabel : property._label;
            property._reverseGroupingLabel = ("reverseGroupingLabel" in propertyEntry) ? propertyEntry.reverseGroupingLabel : property._reverseLabel;
            if ("origin" in propertyEntry) {
                property._origin = propertyEntry.origin;
            }
        }
        this._propertyArray = null;
        this._listeners.fire("onAfterLoadingProperties", []);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Database.loadProperties failed");
    }
};
Exhibit.Database._Impl.prototype.loadItems = function (itemEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingItems", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else {
            if (lastChar != "/" && lastChar != ":") {
                baseURI += "/";
            }
        }
        var spo = this._spo;
        var ops = this._ops;
        var indexPut = Exhibit.Database._indexPut;
        var indexTriple = function (s, p, o) {
            indexPut(spo, s, p, o);
            indexPut(ops, o, p, s);
        };
        for (var i = 0;
             i < itemEntries.length;
             i++) {
            var entry = itemEntries[i];
            if (typeof entry == "object") {
                this._loadItem(entry, indexTriple, baseURI);
            }
        }
        this._propertyArray = null;
        this._listeners.fire("onAfterLoadingItems", []);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Database.loadItems failed");
    }
};
Exhibit.Database._Impl.prototype.getType = function (typeID) {
    return this._types[typeID];
};
Exhibit.Database._Impl.prototype.getProperty = function (propertyID) {
    return propertyID in this._properties ? this._properties[propertyID] : null;
};
Exhibit.Database._Impl.prototype.getAllProperties = function () {
    if (this._propertyArray == null) {
        this._propertyArray = [];
        for (var propertyID in this._properties) {
            this._propertyArray.push(propertyID);
        }
    }
    return[].concat(this._propertyArray);
};
Exhibit.Database._Impl.prototype.isSubmission = function (id) {
    return id in this._submissionRegistry;
};
Exhibit.Database._Impl.prototype.getAllItems = function () {
    var ret = new Exhibit.Set();
    var self = this;
    this._items.visit(function (item) {
        if (!self.isSubmission(item)) {
            ret.add(item);
        }
    });
    return ret;
};
Exhibit.Database._Impl.prototype.getAllSubmissions = function () {
    var ret = new Exhibit.Set();
    var itemList = this._items.toArray();
    for (var i in itemList) {
        var item = itemList[i];
        if (this.isSubmission(item)) {
            ret.add(item);
        }
    }
    return ret;
};
Exhibit.Database._Impl.prototype.getAllItemsCount = function () {
    return this._items.size();
};
Exhibit.Database._Impl.prototype.containsItem = function (itemID) {
    return this._items.contains(itemID);
};
Exhibit.Database._Impl.prototype.getNamespaces = function (idToQualifiedName, prefixToBase) {
    var bases = {};
    for (var propertyID in this._properties) {
        var property = this._properties[propertyID];
        var uri = property.getURI();
        var hash = uri.indexOf("#");
        if (hash > 0) {
            var base = uri.substr(0, hash + 1);
            bases[base] = true;
            idToQualifiedName[propertyID] = {base: base, localName: uri.substr(hash + 1)};
            continue;
        }
        var slash = uri.lastIndexOf("/");
        if (slash > 0) {
            var base = uri.substr(0, slash + 1);
            bases[base] = true;
            idToQualifiedName[propertyID] = {base: base, localName: uri.substr(slash + 1)};
            continue;
        }
    }
    var baseToPrefix = {};
    var letters = "abcdefghijklmnopqrstuvwxyz";
    var i = 0;
    for (var base in bases) {
        var prefix = letters.substr(i++, 1);
        prefixToBase[prefix] = base;
        baseToPrefix[base] = prefix;
    }
    for (var propertyID in idToQualifiedName) {
        var qname = idToQualifiedName[propertyID];
        qname.prefix = baseToPrefix[qname.base];
    }
};
Exhibit.Database._Impl.prototype._loadItem = function (itemEntry, indexFunction, baseURI) {
    if (!("label" in itemEntry) && !("id" in itemEntry)) {
        SimileAjax.Debug.warn("Item entry has no label and no id: " + SimileAjax.JSON.toJSONString(itemEntry));
        itemEntry.label = "item" + Math.ceil(Math.random() * 1000000);
    }
    var id;
    if (!("label" in itemEntry)) {
        id = itemEntry.id;
        if (!this._items.contains(id)) {
            SimileAjax.Debug.warn("Cannot add new item containing no label: " + SimileAjax.JSON.toJSONString(itemEntry));
        }
    } else {
        var label = itemEntry.label;
        var id = ("id" in itemEntry) ? itemEntry.id : label;
        var uri = ("uri" in itemEntry) ? itemEntry.uri : (baseURI + "item#" + encodeURIComponent(id));
        var type = ("type" in itemEntry) ? itemEntry.type : "Item";
        var isArray = function (obj) {
            if (!obj || (obj.constructor.toString().indexOf("Array") == -1)) {
                return false;
            } else {
                return true;
            }
        };
        if (isArray(label)) {
            label = label[0];
        }
        if (isArray(id)) {
            id = id[0];
        }
        if (isArray(uri)) {
            uri = uri[0];
        }
        if (isArray(type)) {
            type = type[0];
        }
        this._items.add(id);
        indexFunction(id, "uri", uri);
        indexFunction(id, "label", label);
        indexFunction(id, "type", type);
        this._ensureTypeExists(type, baseURI);
    }
    for (var p in itemEntry) {
        if (typeof p != "string") {
            continue;
        }
        if (p != "uri" && p != "label" && p != "id" && p != "type") {
            this._ensurePropertyExists(p, baseURI)._onNewData();
            var v = itemEntry[p];
            if (v instanceof Array) {
                for (var j = 0;
                     j < v.length;
                     j++) {
                    indexFunction(id, p, v[j]);
                }
            } else {
                if (v != undefined && v != null) {
                    indexFunction(id, p, v);
                }
            }
        }
    }
};
Exhibit.Database._Impl.prototype._ensureTypeExists = function (typeID, baseURI) {
    if (!(typeID in this._types)) {
        var type = new Exhibit.Database._Type(typeID);
        type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
        type._custom["label"] = typeID;
        this._types[typeID] = type;
    }
};
Exhibit.Database._Impl.prototype._ensurePropertyExists = function (propertyID, baseURI) {
    if (!(propertyID in this._properties)) {
        var property = new Exhibit.Database._Property(propertyID, this);
        property._uri = baseURI + "property#" + encodeURIComponent(propertyID);
        property._valueType = "text";
        property._label = propertyID;
        property._pluralLabel = property._label;
        property._reverseLabel = "reverse of " + property._label;
        property._reversePluralLabel = "reverse of " + property._pluralLabel;
        property._groupingLabel = property._label;
        property._reverseGroupingLabel = property._reverseLabel;
        this._properties[propertyID] = property;
        this._propertyArray = null;
        return property;
    } else {
        return this._properties[propertyID];
    }
};
Exhibit.Database._indexPut = function (index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    var array = hash[y];
    if (!array) {
        array = new Array();
        hash[y] = array;
    } else {
        for (var i = 0;
             i < array.length;
             i++) {
            if (z == array[i]) {
                return;
            }
        }
    }
    array.push(z);
};
Exhibit.Database._indexPutList = function (index, x, y, list) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    var array = hash[y];
    if (!array) {
        hash[y] = list;
    } else {
        hash[y] = hash[y].concat(list);
    }
};
Exhibit.Database._indexRemove = function (index, x, y, z) {
    function isEmpty(obj) {
        for (p in obj) {
            return false;
        }
        return true;
    }

    var hash = index[x];
    if (!hash) {
        return false;
    }
    var array = hash[y];
    if (!array) {
        return false;
    }
    for (var i = 0;
         i < array.length;
         i++) {
        if (z == array[i]) {
            array.splice(i, 1);
            if (array.length == 0) {
                delete hash[y];
                if (isEmpty(hash)) {
                    delete index[x];
                }
            }
            return true;
        }
    }
};
Exhibit.Database._indexRemoveList = function (index, x, y) {
    var hash = index[x];
    if (!hash) {
        return null;
    }
    var array = hash[y];
    if (!array) {
        return null;
    }
    delete hash[y];
    return array;
};
Exhibit.Database._Impl.prototype._indexFillSet = function (index, x, y, set, filter) {
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0;
                     i < array.length;
                     i++) {
                    var z = array[i];
                    if (filter.contains(z)) {
                        set.add(z);
                    }
                }
            } else {
                for (var i = 0;
                     i < array.length;
                     i++) {
                    set.add(array[i]);
                }
            }
        }
    }
};
Exhibit.Database._Impl.prototype._indexCountDistinct = function (index, x, y, filter) {
    var count = 0;
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0;
                     i < array.length;
                     i++) {
                    if (filter.contains(array[i])) {
                        count++;
                    }
                }
            } else {
                count = array.length;
            }
        }
    }
    return count;
};
Exhibit.Database._Impl.prototype._get = function (index, x, y, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    this._indexFillSet(index, x, y, set, filter);
    return set;
};
Exhibit.Database._Impl.prototype._getUnion = function (index, xSet, y, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    var database = this;
    xSet.visit(function (x) {
        database._indexFillSet(index, x, y, set, filter);
    });
    return set;
};
Exhibit.Database._Impl.prototype._countDistinctUnion = function (index, xSet, y, filter) {
    var count = 0;
    var database = this;
    xSet.visit(function (x) {
        count += database._indexCountDistinct(index, x, y, filter);
    });
    return count;
};
Exhibit.Database._Impl.prototype._countDistinct = function (index, x, y, filter) {
    return this._indexCountDistinct(index, x, y, filter);
};
Exhibit.Database._Impl.prototype._getProperties = function (index, x) {
    var hash = index[x];
    var properties = [];
    if (hash) {
        for (var p in hash) {
            properties.push(p);
        }
    }
    return properties;
};
Exhibit.Database._Impl.prototype.getObjects = function (s, p, set, filter) {
    return this._get(this._spo, s, p, set, filter);
};
Exhibit.Database._Impl.prototype.countDistinctObjects = function (s, p, filter) {
    return this._countDistinct(this._spo, s, p, filter);
};
Exhibit.Database._Impl.prototype.getObjectsUnion = function (subjects, p, set, filter) {
    return this._getUnion(this._spo, subjects, p, set, filter);
};
Exhibit.Database._Impl.prototype.countDistinctObjectsUnion = function (subjects, p, filter) {
    return this._countDistinctUnion(this._spo, subjects, p, filter);
};
Exhibit.Database._Impl.prototype.getSubjects = function (o, p, set, filter) {
    return this._get(this._ops, o, p, set, filter);
};
Exhibit.Database._Impl.prototype.countDistinctSubjects = function (o, p, filter) {
    return this._countDistinct(this._ops, o, p, filter);
};
Exhibit.Database._Impl.prototype.getSubjectsUnion = function (objects, p, set, filter) {
    return this._getUnion(this._ops, objects, p, set, filter);
};
Exhibit.Database._Impl.prototype.countDistinctSubjectsUnion = function (objects, p, filter) {
    return this._countDistinctUnion(this._ops, objects, p, filter);
};
Exhibit.Database._Impl.prototype.getObject = function (s, p) {
    var hash = this._spo[s];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};
Exhibit.Database._Impl.prototype.getSubject = function (o, p) {
    var hash = this._ops[o];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};
Exhibit.Database._Impl.prototype.getForwardProperties = function (s) {
    return this._getProperties(this._spo, s);
};
Exhibit.Database._Impl.prototype.getBackwardProperties = function (o) {
    return this._getProperties(this._ops, o);
};
Exhibit.Database._Impl.prototype.getSubjectsInRange = function (p, min, max, inclusive, set, filter) {
    var property = this.getProperty(p);
    if (property != null) {
        var rangeIndex = property.getRangeIndex();
        if (rangeIndex != null) {
            return rangeIndex.getSubjectsInRange(min, max, inclusive, set, filter);
        }
    }
    return(!set) ? new Exhibit.Set() : set;
};
Exhibit.Database._Impl.prototype.getTypeIDs = function (set) {
    return this.getObjectsUnion(set, "type", null, null);
};
Exhibit.Database._Impl.prototype.addStatement = function (s, p, o) {
    var indexPut = Exhibit.Database._indexPut;
    indexPut(this._spo, s, p, o);
    indexPut(this._ops, o, p, s);
};
Exhibit.Database._Impl.prototype.removeStatement = function (s, p, o) {
    var indexRemove = Exhibit.Database._indexRemove;
    var removedObject = indexRemove(this._spo, s, p, o);
    var removedSubject = indexRemove(this._ops, o, p, s);
    return removedObject || removedSubject;
};
Exhibit.Database._Impl.prototype.removeObjects = function (s, p) {
    var indexRemove = Exhibit.Database._indexRemove;
    var indexRemoveList = Exhibit.Database._indexRemoveList;
    var objects = indexRemoveList(this._spo, s, p);
    if (objects == null) {
        return false;
    } else {
        for (var i = 0;
             i < objects.length;
             i++) {
            indexRemove(this._ops, objects[i], p, s);
        }
        return true;
    }
};
Exhibit.Database._Impl.prototype.removeSubjects = function (o, p) {
    var indexRemove = Exhibit.Database._indexRemove;
    var indexRemoveList = Exhibit.Database._indexRemoveList;
    var subjects = indexRemoveList(this._ops, o, p);
    if (subjects == null) {
        return false;
    } else {
        for (var i = 0;
             i < subjects.length;
             i++) {
            indexRemove(this._spo, subjects[i], p, o);
        }
        return true;
    }
};
Exhibit.Database._Impl.prototype.removeAllStatements = function () {
    this._listeners.fire("onBeforeRemovingAllStatements", []);
    try {
        this._spo = {};
        this._ops = {};
        this._items = new Exhibit.Set();
        for (var propertyID in this._properties) {
            this._properties[propertyID]._onNewData();
        }
        this._propertyArray = null;
        this._listeners.fire("onAfterRemovingAllStatements", []);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Database.removeAllStatements failed");
    }
};
Exhibit.Database._Type = function (id) {
    this._id = id;
    this._custom = {};
};
Exhibit.Database._Type.prototype = {getID: function () {
    return this._id;
}, getURI: function () {
    return this._custom["uri"];
}, getLabel: function () {
    return this._custom["label"];
}, getOrigin: function () {
    return this._custom["origin"];
}, getProperty: function (p) {
    return this._custom[p];
}};
Exhibit.Database._Property = function (id, database) {
    this._id = id;
    this._database = database;
    this._rangeIndex = null;
};
Exhibit.Database._Property.prototype = {getID: function () {
    return this._id;
}, getURI: function () {
    return this._uri;
}, getValueType: function () {
    return this._valueType;
}, getLabel: function () {
    return this._label;
}, getPluralLabel: function () {
    return this._pluralLabel;
}, getReverseLabel: function () {
    return this._reverseLabel;
}, getReversePluralLabel: function () {
    return this._reversePluralLabel;
}, getGroupingLabel: function () {
    return this._groupingLabel;
}, getGroupingPluralLabel: function () {
    return this._groupingPluralLabel;
}, getOrigin: function () {
    return this._origin;
}};
Exhibit.Database._Property.prototype._onNewData = function () {
    this._rangeIndex = null;
};
Exhibit.Database._Property.prototype.getRangeIndex = function () {
    if (this._rangeIndex == null) {
        this._buildRangeIndex();
    }
    return this._rangeIndex;
};
Exhibit.Database._Property.prototype._buildRangeIndex = function () {
    var getter;
    var database = this._database;
    var p = this._id;
    switch (this.getValueType()) {
        case"date":
            getter = function (item, f) {
                database.getObjects(item, p, null, null).visit(function (value) {
                    if (value != null && !(value instanceof Date)) {
                        value = SimileAjax.DateTime.parseIso8601DateTime(value);
                    }
                    if (value instanceof Date) {
                        f(value.getTime());
                    }
                });
            };
            break;
        default:
            getter = function (item, f) {
                database.getObjects(item, p, null, null).visit(function (value) {
                    if (typeof value != "number") {
                        value = parseFloat(value);
                    }
                    if (!isNaN(value)) {
                        f(value);
                    }
                });
            };
            break;
    }
    this._rangeIndex = new Exhibit.Database._RangeIndex(this._database.getAllItems(), getter);
};
Exhibit.Database._RangeIndex = function (items, getter) {
    pairs = [];
    items.visit(function (item) {
        getter(item, function (value) {
            pairs.push({item: item, value: value});
        });
    });
    pairs.sort(function (p1, p2) {
        var c = p1.value - p2.value;
        return(isNaN(c) === false) ? c : p1.value.localeCompare(p2.value);
    });
    this._pairs = pairs;
};
Exhibit.Database._RangeIndex.prototype.getCount = function () {
    return this._pairs.length;
};
Exhibit.Database._RangeIndex.prototype.getMin = function () {
    return this._pairs.length > 0 ? this._pairs[0].value : Number.POSITIVE_INFINITY;
};
Exhibit.Database._RangeIndex.prototype.getMax = function () {
    return this._pairs.length > 0 ? this._pairs[this._pairs.length - 1].value : Number.NEGATIVE_INFINITY;
};
Exhibit.Database._RangeIndex.prototype.getRange = function (visitor, min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var pairs = this._pairs;
    var l = pairs.length;
    inclusive = (inclusive);
    while (startIndex < l) {
        var pair = pairs[startIndex++];
        var value = pair.value;
        if (value < max || (value == max && inclusive)) {
            visitor(pair.item);
        } else {
            break;
        }
    }
};
Exhibit.Database._RangeIndex.prototype.getSubjectsInRange = function (min, max, inclusive, set, filter) {
    if (!set) {
        set = new Exhibit.Set();
    }
    var f = (filter != null) ? function (item) {
        if (filter.contains(item)) {
            set.add(item);
        }
    } : function (item) {
        set.add(item);
    };
    this.getRange(f, min, max, inclusive);
    return set;
};
Exhibit.Database._RangeIndex.prototype.countRange = function (min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var endIndex = this._indexOf(max);
    if (inclusive) {
        var pairs = this._pairs;
        var l = pairs.length;
        while (endIndex < l) {
            if (pairs[endIndex].value == max) {
                endIndex++;
            } else {
                break;
            }
        }
    }
    return endIndex - startIndex;
};
Exhibit.Database._RangeIndex.prototype._indexOf = function (v) {
    var pairs = this._pairs;
    if (pairs.length == 0 || pairs[0].value >= v) {
        return 0;
    }
    var from = 0;
    var to = pairs.length;
    while (from + 1 < to) {
        var middle = (from + to) >> 1;
        var v2 = pairs[middle].value;
        if (v2 >= v) {
            to = middle;
        } else {
            from = middle;
        }
    }
    return to;
};
Exhibit.Database._Impl.prototype.isNewItem = function (id) {
    return id in this._newItems;
};
Exhibit.Database._Impl.prototype.getItem = function (id) {
    var item = {id: id};
    var properties = this.getAllProperties();
    for (var i in properties) {
        var prop = properties[i];
        var val = this.getObject(id, prop);
        if (val) {
            item[prop] = val;
        }
    }
    return item;
};
Exhibit.Database._Impl.prototype.addItem = function (item) {
    if (!item.id) {
        item.id = item.label;
    }
    if (!item.modified) {
        item.modified = "yes";
    }
    this._ensurePropertyExists(Exhibit.Database.TimestampPropertyName);
    item[Exhibit.Database.TimestampPropertyName] = Exhibit.Database.makeISO8601DateString();
    this.loadItems([item], "");
    this._newItems[item.id] = true;
    this._listeners.fire("onAfterLoadingItems", []);
};
Exhibit.Database._Impl.prototype.editItem = function (id, prop, value) {
    if (prop.toLowerCase() == "id") {
        Exhibit.UI.showHelp("We apologize, but changing the IDs of items in the Exhibit isn't supported at the moment.");
        return;
    }
    var prevValue = this.getObject(id, prop);
    this._originalValues[id] = this._originalValues[id] || {};
    this._originalValues[id][prop] = this._originalValues[id][prop] || prevValue;
    var origVal = this._originalValues[id][prop];
    if (origVal == value) {
        this.removeObjects(id, "modified");
        this.addStatement(id, "modified", "no");
        delete this._originalValues[id][prop];
    } else {
        if (this.getObject(id, "modified") != "yes") {
            this.removeObjects(id, "modified");
            this.addStatement(id, "modified", "yes");
        }
    }
    this.removeObjects(id, prop);
    this.addStatement(id, prop, value);
    var propertyObject = this._ensurePropertyExists(prop);
    propertyObject._onNewData();
    this._listeners.fire("onAfterLoadingItems", []);
};
Exhibit.Database._Impl.prototype.removeItem = function (id) {
    if (!this.containsItem(id)) {
        throw"Removing non-existent item " + id;
    }
    this._items.remove(id);
    delete this._spo[id];
    if (this._newItems[id]) {
        delete this._newItems[id];
    }
    if (this._originalValues[id]) {
        delete this._originalValues[id];
    }
    var properties = this.getAllProperties();
    for (var i in properties) {
        var prop = properties[i];
        this.removeObjects(id, prop);
    }
    this._listeners.fire("onAfterLoadingItems", []);
};
Exhibit.Database.defaultIgnoredProperties = ["uri", "modified"];
Exhibit.Database._Impl.prototype.fixAllChanges = function () {
    this._originalValues = {};
    this._newItems = {};
    var items = this._items.toArray();
    for (var i in items) {
        var id = items[i];
        this.removeObjects(id, "modified");
        this.addStatement(id, "modified", "no");
    }
};
Exhibit.Database._Impl.prototype.fixChangesForItem = function (id) {
    delete this._originalValues[id];
    delete this._newItems[id];
    this.removeObjects(id, "modified");
    this.addStatement(id, "modified", "no");
};
Exhibit.Database._Impl.prototype.collectChangesForItem = function (id, ignoredProperties) {
    ignoredProperties = ignoredProperties || Exhibit.Database.defaultIgnoredProperties;
    var type = this.getObject(id, "type");
    var label = this.getObject(id, "label") || id;
    var item = {id: id, label: label, type: type, vals: {}};
    if (id in this._newItems) {
        item.changeType = "added";
        var properties = this.getAllProperties();
        for (var i in properties) {
            var prop = properties[i];
            if (ignoredProperties.indexOf(prop) != -1) {
                continue;
            }
            var val = this.getObject(id, prop);
            if (val) {
                item.vals[prop] = {newVal: val};
            }
        }
    } else {
        if (id in this._originalValues && !this.isSubmission(id)) {
            item.changeType = "modified";
            var vals = this._originalValues[id];
            var hasModification = false;
            for (var prop in vals) {
                if (ignoredProperties.indexOf(prop) != -1) {
                    continue;
                }
                hasModification = true;
                var oldVal = this._originalValues[id][prop];
                var newVal = this.getObject(id, prop);
                if (!newVal) {
                    SimileAjax.Debug.warn("empty value for " + id + ", " + prop);
                } else {
                    item.vals[prop] = {oldVal: oldVal, newVal: newVal};
                }
            }
            if (!hasModification) {
                return null;
            }
        } else {
            return null;
        }
    }
    if (!item[Exhibit.Database.TimestampPropertyName]) {
        item[Exhibit.Database.TimestampPropertyName] = Exhibit.Database.makeISO8601DateString();
    }
    return item;
};
Exhibit.Database._Impl.prototype.collectAllChanges = function (ignoredProperties) {
    var ret = [];
    var items = this._items.toArray();
    for (var i in items) {
        var id = items[i];
        var item = this.collectChangesForItem(id, ignoredProperties);
        if (item) {
            ret.push(item);
        }
    }
    return ret;
};
Exhibit.Database._Impl.prototype.mergeSubmissionIntoItem = function (submissionID) {
    var db = this;
    if (!this.isSubmission(submissionID)) {
        throw submissionID + " is not a submission!";
    }
    var change = this.getObject(submissionID, "change");
    if (change == "modification") {
        var itemID = this.getObject(submissionID, "changedItem");
        var vals = this._spo[submissionID];
        SimileAjax.jQuery.each(vals, function (attr, val) {
            if (Exhibit.Database.defaultIgnoredSubmissionProperties.indexOf(attr) != -1) {
                return;
            }
            if (val.length == 1) {
                db.editItem(itemID, attr, val[0]);
            } else {
                SimileAjax.Debug.warn("Exhibit.Database._Impl.prototype.commitChangeToItem cannot handle multiple values for attribute " + attr + ": " + val);
            }
        });
        delete this._submissionRegistry[submissionID];
    } else {
        if (change == "addition") {
            delete this._submissionRegistry[submissionID];
            this._newItems[submissionID] = true;
        } else {
            throw"unknown change type " + change;
        }
    }
    this._listeners.fire("onAfterLoadingItems", []);
};


/* bibtex-exporter.js */
Exhibit.BibtexExporter = {getLabel: function () {
    return"Bibtex";
}, _excludeProperties: {"pub-type": true, "type": true, "uri": true, "key": true}};
Exhibit.BibtexExporter.exportOne = function (itemID, database) {
    return Exhibit.BibtexExporter._wrap(Exhibit.BibtexExporter._exportOne(itemID, database));
};
Exhibit.BibtexExporter.exportMany = function (set, database) {
    var s = "";
    set.visit(function (itemID) {
        s += Exhibit.BibtexExporter._exportOne(itemID, database) + "\n";
    });
    return Exhibit.BibtexExporter._wrap(s);
};
Exhibit.BibtexExporter._exportOne = function (itemID, database) {
    var s = "";
    var type = database.getObject(itemID, "pub-type");
    var key = database.getObject(itemID, "key");
    key = (key != null ? key : itemID);
    key = key.replace(/[\s,]/g, "-");
    s += "@" + type + "{" + key + ",\n";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        if (values.size() > 0 && !(propertyID in Exhibit.BibtexExporter._excludeProperties)) {
            s += "\t" + (propertyID == "label" ? "title" : propertyID) + ' = "';
            var strings;
            if (valueType == "item") {
                strings = [];
                values.visit(function (value) {
                    strings.push(database.getObject(value, "label"));
                });
            } else {
                if (valueType == "url") {
                    strings = [];
                    values.visit(function (value) {
                        strings.push(Exhibit.Persistence.resolveURL(value));
                    });
                } else {
                    strings = values.toArray();
                }
            }
            s += strings.join(" and ") + '",\n';
        }
    }
    s += '\torigin = "' + Exhibit.Persistence.getItemLink(itemID) + '"\n';
    s += "}\n";
    return s;
};
Exhibit.BibtexExporter._wrap = function (s) {
    return s;
};


/* exhibit-json-exporter.js */
Exhibit.ExhibitJsonExporter = {getLabel: function () {
    return Exhibit.l10n.exhibitJsonExporterLabel;
}};
Exhibit.ExhibitJsonExporter.exportOne = function (itemID, database) {
    return Exhibit.ExhibitJsonExporter._wrap(Exhibit.ExhibitJsonExporter._exportOne(itemID, database) + "\n");
};
Exhibit.ExhibitJsonExporter.exportMany = function (set, database) {
    var s = "";
    var size = set.size();
    var count = 0;
    set.visit(function (itemID) {
        s += Exhibit.ExhibitJsonExporter._exportOne(itemID, database) + ((count++ < size - 1) ? ",\n" : "\n");
    });
    return Exhibit.ExhibitJsonExporter._wrap(s);
};
Exhibit.ExhibitJsonExporter._exportOne = function (itemID, database) {
    function quote(s) {
        if (/[\\\x00-\x1F\x22]/.test(s)) {
            return'"' + s.replace(/([\\\x00-\x1f\x22])/g, function (a, b) {
                var c = {"\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", '"': '\\"', "\\": "\\\\"}[b];
                if (c) {
                    return c;
                }
                c = b.charCodeAt();
                return"\\x" + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            }) + '"';
        }
        return'"' + s + '"';
    }

    var s = "";
    var uri = database.getObject(itemID, "uri");
    s += '  {"id":' + quote(itemID) + ",\n";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        if (values.size() > 0) {
            var array;
            if (valueType == "url") {
                array = [];
                values.visit(function (value) {
                    array.push(Exhibit.Persistence.resolveURL(value));
                });
            } else {
                array = values.toArray();
            }
            s += "   " + quote(propertyID) + ":";
            if (array.length == 1) {
                s += quote(array[0]);
            } else {
                s += "[";
                for (var j = 0;
                     j < array.length;
                     j++) {
                    s += (j > 0 ? "," : "") + quote(array[j]);
                }
                s += "]";
            }
            s += ",\n";
        }
    }
    s += '   "origin":' + quote(Exhibit.Persistence.getItemLink(itemID)) + "\n";
    s += "  }";
    return s;
};
Exhibit.ExhibitJsonExporter._wrap = function (s) {
    return'{\n "items":[\n' + s + " ]\n}";
};


/* facet-selection-exporter.js */
Exhibit.FacetSelectionExporter = {getLabel: function () {
    return"Facet Selections";
}, exportOne: function (itemID, database) {
    return Exhibit.FacetSelectionExporter._exportUrl();
}, exportMany: function (set, database) {
    return Exhibit.FacetSelectionExporter._exportUrl();
}};
Exhibit.FacetSelectionExporter._exportUrl = function () {
    var currentSettings = window.exhibit.exportSettings();
    var url = window.location.href.split("?")[0] + "?";
    var sep = "";
    for (id in currentSettings) {
        url += sep + id + "=" + escape(currentSettings[id]);
        if (sep === "") {
            sep = "&";
        }
    }
    return url;
};


/* rdf-xml-exporter.js */
Exhibit.RdfXmlExporter = {getLabel: function () {
    return Exhibit.l10n.rdfXmlExporterLabel;
}};
Exhibit.RdfXmlExporter.exportOne = function (itemID, database) {
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    return Exhibit.RdfXmlExporter._wrapRdf(Exhibit.RdfXmlExporter._exportOne(itemID, database, propertyIDToQualifiedName, prefixToBase), prefixToBase);
};
Exhibit.RdfXmlExporter.exportMany = function (set, database) {
    var s = "";
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    set.visit(function (itemID) {
        s += Exhibit.RdfXmlExporter._exportOne(itemID, database, propertyIDToQualifiedName, prefixToBase) + "\n";
    });
    return Exhibit.RdfXmlExporter._wrapRdf(s, prefixToBase);
};
Exhibit.RdfXmlExporter._exportOne = function (itemID, database, propertyIDToQualifiedName, prefixToBase) {
    var s = "";
    var uri = database.getObject(itemID, "uri");
    s += "<rdf:Description rdf:about='" + uri + "'>\n";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        var propertyString;
        if (propertyID in propertyIDToQualifiedName) {
            var qname = propertyIDToQualifiedName[propertyID];
            propertyString = qname.prefix + ":" + qname.localName;
        } else {
            propertyString = property.getURI();
        }
        if (valueType == "item") {
            values.visit(function (value) {
                s += "\t<" + propertyString + " rdf:resource='" + value + "' />\n";
            });
        } else {
            if (propertyID != "uri") {
                if (valueType == "url") {
                    values.visit(function (value) {
                        s += "\t<" + propertyString + ">" + Exhibit.Persistence.resolveURL(value) + "</" + propertyString + ">\n";
                    });
                } else {
                    values.visit(function (value) {
                        s += "\t<" + propertyString + ">" + value + "</" + propertyString + ">\n";
                    });
                }
            }
        }
    }
    s += "\t<exhibit:origin>" + Exhibit.Persistence.getItemLink(itemID) + "</exhibit:origin>\n";
    s += "</rdf:Description>";
    return s;
};
Exhibit.RdfXmlExporter._wrapRdf = function (s, prefixToBase) {
    var s2 = "<?xml version='1.0'?>\n<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'\n\txmlns:exhibit='http://simile.mit.edu/2006/11/exhibit#'";
    for (prefix in prefixToBase) {
        s2 += "\n\txmlns:" + prefix + "='" + prefixToBase[prefix] + "'";
    }
    s2 += ">\n" + s + "\n</rdf:RDF>";
    return s2;
};


/* semantic-wikitext-exporter.js */
Exhibit.SemanticWikitextExporter = {getLabel: function () {
    return Exhibit.l10n.smwExporterLabel;
}};
Exhibit.SemanticWikitextExporter.exportOne = function (itemID, database) {
    return Exhibit.SemanticWikitextExporter._wrap(Exhibit.SemanticWikitextExporter._exportOne(itemID, database));
};
Exhibit.SemanticWikitextExporter.exportMany = function (set, database) {
    var s = "";
    set.visit(function (itemID) {
        s += Exhibit.SemanticWikitextExporter._exportOne(itemID, database) + "\n";
    });
    return Exhibit.SemanticWikitextExporter._wrap(s);
};
Exhibit.SemanticWikitextExporter._exportOne = function (itemID, database) {
    var s = "";
    var uri = database.getObject(itemID, "uri");
    s += uri + "\n";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        if (valueType == "item") {
            values.visit(function (value) {
                s += "[[" + propertyID + "::" + value + "]]\n";
            });
        } else {
            if (valueType == "url") {
                values.visit(function (value) {
                    s += "[[" + propertyID + ":=" + Exhibit.Persistence.resolveURL(value) + "]]\n";
                });
            } else {
                values.visit(function (value) {
                    s += "[[" + propertyID + ":=" + value + "]]\n";
                });
            }
        }
    }
    s += "[[origin:=" + Exhibit.Persistence.getItemLink(itemID) + "]]\n";
    s += "\n";
    return s;
};
Exhibit.SemanticWikitextExporter._wrap = function (s) {
    return s;
};


/* tsv-exporter.js */
Exhibit.TSVExporter = {getLabel: function () {
    return Exhibit.l10n.tsvExporterLabel;
}};
Exhibit.TSVExporter.exportOne = function (itemID, database) {
    return Exhibit.TSVExporter._wrap(Exhibit.TSVExporter._exportOne(itemID, database), database);
};
Exhibit.TSVExporter.exportMany = function (set, database) {
    var s = "";
    set.visit(function (itemID) {
        s += Exhibit.TSVExporter._exportOne(itemID, database) + "\n";
    });
    return Exhibit.TSVExporter._wrap(s, database);
};
Exhibit.TSVExporter._exportOne = function (itemID, database) {
    var s = "";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        s += values.toArray().join("; ") + "\t";
    }
    return s;
};
Exhibit.TSVExporter._wrap = function (s, database) {
    var header = "";
    var allProperties = database.getAllProperties();
    for (var i = 0;
         i < allProperties.length;
         i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var valueType = property.getValueType();
        header += propertyID + ":" + valueType + "\t";
    }
    return header + "\n" + s;
};


/* expression-parser.js */
Exhibit.ExpressionParser = new Object();
Exhibit.ExpressionParser.parse = function (s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    var scanner = new Exhibit.ExpressionScanner(s, startIndex);
    try {
        return Exhibit.ExpressionParser._internalParse(scanner, false);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};
Exhibit.ExpressionParser.parseSeveral = function (s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    var scanner = new Exhibit.ExpressionScanner(s, startIndex);
    try {
        return Exhibit.ExpressionParser._internalParse(scanner, true);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};
Exhibit.ExpressionParser._internalParse = function (scanner, several) {
    var Scanner = Exhibit.ExpressionScanner;
    var token = scanner.token();
    var next = function () {
        scanner.next();
        token = scanner.token();
    };
    var makePosition = function () {
        return token != null ? token.start : scanner.index();
    };
    var parsePath = function () {
        var path = new Exhibit.Expression.Path();
        while (token != null && token.type == Scanner.PATH_OPERATOR) {
            var hopOperator = token.value;
            next();
            if (token != null && token.type == Scanner.IDENTIFIER) {
                path.appendSegment(token.value, hopOperator);
                next();
            } else {
                throw new Error("Missing property ID at position " + makePosition());
            }
        }
        return path;
    };
    var parseFactor = function () {
        if (token == null) {
            throw new Error("Missing factor at end of expression");
        }
        var result = null;
        switch (token.type) {
            case Scanner.NUMBER:
                result = new Exhibit.Expression._Constant(token.value, "number");
                next();
                break;
            case Scanner.STRING:
                result = new Exhibit.Expression._Constant(token.value, "text");
                next();
                break;
            case Scanner.PATH_OPERATOR:
                result = parsePath();
                break;
            case Scanner.IDENTIFIER:
                var identifier = token.value;
                next();
                if (identifier in Exhibit.Controls) {
                    if (token != null && token.type == Scanner.DELIMITER && token.value == "(") {
                        next();
                        var args = (token != null && token.type == Scanner.DELIMITER && token.value == ")") ? [] : parseExpressionList();
                        result = new Exhibit.Expression._ControlCall(identifier, args);
                        if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                            next();
                        } else {
                            throw new Error("Missing ) to end " + identifier + " at position " + makePosition());
                        }
                    } else {
                        throw new Error("Missing ( to start " + identifier + " at position " + makePosition());
                    }
                } else {
                    if (token != null && token.type == Scanner.DELIMITER && token.value == "(") {
                        next();
                        var args = (token != null && token.type == Scanner.DELIMITER && token.value == ")") ? [] : parseExpressionList();
                        result = new Exhibit.Expression._FunctionCall(identifier, args);
                        if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                            next();
                        } else {
                            throw new Error("Missing ) after function call " + identifier + " at position " + makePosition());
                        }
                    } else {
                        result = parsePath();
                        result.setRootName(identifier);
                    }
                }
                break;
            case Scanner.DELIMITER:
                if (token.value == "(") {
                    next();
                    result = parseExpression();
                    if (token != null && token.type == Scanner.DELIMITER && token.value == ")") {
                        next();
                        break;
                    } else {
                        throw new Error("Missing ) at position " + makePosition());
                    }
                }
            default:
                throw new Error("Unexpected text " + token.value + " at position " + makePosition());
        }
        return result;
    };
    var parseTerm = function () {
        var term = parseFactor();
        while (token != null && token.type == Scanner.OPERATOR && (token.value == "*" || token.value == "/")) {
            var operator = token.value;
            next();
            term = new Exhibit.Expression._Operator(operator, [term, parseFactor()]);
        }
        return term;
    };
    var parseSubExpression = function () {
        var subExpression = parseTerm();
        while (token != null && token.type == Scanner.OPERATOR && (token.value == "+" || token.value == "-")) {
            var operator = token.value;
            next();
            subExpression = new Exhibit.Expression._Operator(operator, [subExpression, parseTerm()]);
        }
        return subExpression;
    };
    var parseExpression = function () {
        var expression = parseSubExpression();
        while (token != null && token.type == Scanner.OPERATOR && (token.value == "=" || token.value == "<>" || token.value == "<" || token.value == "<=" || token.value == ">" || token.value == ">=")) {
            var operator = token.value;
            next();
            expression = new Exhibit.Expression._Operator(operator, [expression, parseSubExpression()]);
        }
        return expression;
    };
    var parseExpressionList = function () {
        var expressions = [parseExpression()];
        while (token != null && token.type == Scanner.DELIMITER && token.value == ",") {
            next();
            expressions.push(parseExpression());
        }
        return expressions;
    };
    if (several) {
        var roots = parseExpressionList();
        var expressions = [];
        for (var r = 0;
             r < roots.length;
             r++) {
            expressions.push(new Exhibit.Expression._Impl(roots[r]));
        }
        return expressions;
    } else {
        return new Exhibit.Expression._Impl(parseExpression());
    }
};
Exhibit.ExpressionScanner = function (text, startIndex) {
    this._text = text + " ";
    this._maxIndex = text.length;
    this._index = startIndex;
    this.next();
};
Exhibit.ExpressionScanner.DELIMITER = 0;
Exhibit.ExpressionScanner.NUMBER = 1;
Exhibit.ExpressionScanner.STRING = 2;
Exhibit.ExpressionScanner.IDENTIFIER = 3;
Exhibit.ExpressionScanner.OPERATOR = 4;
Exhibit.ExpressionScanner.PATH_OPERATOR = 5;
Exhibit.ExpressionScanner.prototype.token = function () {
    return this._token;
};
Exhibit.ExpressionScanner.prototype.index = function () {
    return this._index;
};
Exhibit.ExpressionScanner.prototype.next = function () {
    this._token = null;
    while (this._index < this._maxIndex && " \t\r\n".indexOf(this._text.charAt(this._index)) >= 0) {
        this._index++;
    }
    if (this._index < this._maxIndex) {
        var c1 = this._text.charAt(this._index);
        var c2 = this._text.charAt(this._index + 1);
        if (".!".indexOf(c1) >= 0) {
            if (c2 == "@") {
                this._token = {type: Exhibit.ExpressionScanner.PATH_OPERATOR, value: c1 + c2, start: this._index, end: this._index + 2};
                this._index += 2;
            } else {
                this._token = {type: Exhibit.ExpressionScanner.PATH_OPERATOR, value: c1, start: this._index, end: this._index + 1};
                this._index++;
            }
        } else {
            if ("<>".indexOf(c1) >= 0) {
                if ((c2 == "=") || ("<>".indexOf(c2) >= 0 && c1 != c2)) {
                    this._token = {type: Exhibit.ExpressionScanner.OPERATOR, value: c1 + c2, start: this._index, end: this._index + 2};
                    this._index += 2;
                } else {
                    this._token = {type: Exhibit.ExpressionScanner.OPERATOR, value: c1, start: this._index, end: this._index + 1};
                    this._index++;
                }
            } else {
                if ("+-*/=".indexOf(c1) >= 0) {
                    this._token = {type: Exhibit.ExpressionScanner.OPERATOR, value: c1, start: this._index, end: this._index + 1};
                    this._index++;
                } else {
                    if ("(),".indexOf(c1) >= 0) {
                        this._token = {type: Exhibit.ExpressionScanner.DELIMITER, value: c1, start: this._index, end: this._index + 1};
                        this._index++;
                    } else {
                        if ("\"'".indexOf(c1) >= 0) {
                            var i = this._index + 1;
                            while (i < this._maxIndex) {
                                if (this._text.charAt(i) == c1 && this._text.charAt(i - 1) != "\\") {
                                    break;
                                }
                                i++;
                            }
                            if (i < this._maxIndex) {
                                this._token = {type: Exhibit.ExpressionScanner.STRING, value: this._text.substring(this._index + 1, i).replace(/\\'/g, "'").replace(/\\"/g, '"'), start: this._index, end: i + 1};
                                this._index = i + 1;
                            } else {
                                throw new Error("Unterminated string starting at " + this._index);
                            }
                        } else {
                            if (this._isDigit(c1)) {
                                var i = this._index;
                                while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                                    i++;
                                }
                                if (i < this._maxIndex && this._text.charAt(i) == ".") {
                                    i++;
                                    while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                                        i++;
                                    }
                                }
                                this._token = {type: Exhibit.ExpressionScanner.NUMBER, value: parseFloat(this._text.substring(this._index, i)), start: this._index, end: i};
                                this._index = i;
                            } else {
                                var i = this._index;
                                while (i < this._maxIndex) {
                                    var c = this._text.charAt(i);
                                    if ("(),.!@ \t".indexOf(c) < 0) {
                                        i++;
                                    } else {
                                        break;
                                    }
                                }
                                this._token = {type: Exhibit.ExpressionScanner.IDENTIFIER, value: this._text.substring(this._index, i), start: this._index, end: i};
                                this._index = i;
                            }
                        }
                    }
                }
            }
        }
    }
};
Exhibit.ExpressionScanner.prototype._isDigit = function (c) {
    return"0123456789".indexOf(c) >= 0;
};


/* expression.js */
Exhibit.Expression = new Object();
Exhibit.Expression._Impl = function (rootNode) {
    this._rootNode = rootNode;
};
Exhibit.Expression._Impl.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    return{values: collection.getSet(), valueType: collection.valueType, size: collection.size};
};
Exhibit.Expression._Impl.prototype.evaluateOnItem = function (itemID, database) {
    return this.evaluate({"value": itemID}, {"value": "item"}, "value", database);
};
Exhibit.Expression._Impl.prototype.evaluateSingle = function (roots, rootValueTypes, defaultRootName, database) {
    var collection = this._rootNode.evaluate(roots, rootValueTypes, defaultRootName, database);
    var result = {value: null, valueType: collection.valueType};
    collection.forEachValue(function (v) {
        result.value = v;
        return true;
    });
    return result;
};
Exhibit.Expression._Impl.prototype.evaluateSingleOnItem = function (itemID, database) {
    return this.evaluateSingle({"value": itemID}, {"value": "item"}, "value", database);
};
Exhibit.Expression._Impl.prototype.testExists = function (roots, rootValueTypes, defaultRootName, database) {
    return this.isPath() ? this._rootNode.testExists(roots, rootValueTypes, defaultRootName, database) : this.evaluate(roots, rootValueTypes, defaultRootName, database).values.size() > 0;
};
Exhibit.Expression._Impl.prototype.isPath = function () {
    return this._rootNode instanceof Exhibit.Expression.Path;
};
Exhibit.Expression._Impl.prototype.getPath = function () {
    return this.isPath() ? this._rootNode : null;
};
Exhibit.Expression._Collection = function (values, valueType) {
    this._values = values;
    this.valueType = valueType;
    if (values instanceof Array) {
        this.forEachValue = Exhibit.Expression._Collection._forEachValueInArray;
        this.getSet = Exhibit.Expression._Collection._getSetFromArray;
        this.contains = Exhibit.Expression._Collection._containsInArray;
        this.size = values.length;
    } else {
        this.forEachValue = Exhibit.Expression._Collection._forEachValueInSet;
        this.getSet = Exhibit.Expression._Collection._getSetFromSet;
        this.contains = Exhibit.Expression._Collection._containsInSet;
        this.size = values.size();
    }
};
Exhibit.Expression._Collection._forEachValueInSet = function (f) {
    this._values.visit(f);
};
Exhibit.Expression._Collection._forEachValueInArray = function (f) {
    var a = this._values;
    for (var i = 0;
         i < a.length;
         i++) {
        if (f(a[i])) {
            break;
        }
    }
};
Exhibit.Expression._Collection._getSetFromSet = function () {
    return this._values;
};
Exhibit.Expression._Collection._getSetFromArray = function () {
    return new Exhibit.Set(this._values);
};
Exhibit.Expression._Collection._containsInSet = function (v) {
    this._values.contains(v);
};
Exhibit.Expression._Collection._containsInArray = function (v) {
    var a = this._values;
    for (var i = 0;
         i < a.length;
         i++) {
        if (a[i] == v) {
            return true;
        }
    }
    return false;
};
Exhibit.Expression.Path = function () {
    this._rootName = null;
    this._segments = [];
};
Exhibit.Expression.Path.create = function (property, forward) {
    var path = new Exhibit.Expression.Path();
    path._segments.push({property: property, forward: forward, isArray: false});
    return path;
};
Exhibit.Expression.Path.prototype.setRootName = function (rootName) {
    this._rootName = rootName;
};
Exhibit.Expression.Path.prototype.appendSegment = function (property, hopOperator) {
    this._segments.push({property: property, forward: hopOperator.charAt(0) == ".", isArray: hopOperator.length > 1});
};
Exhibit.Expression.Path.prototype.getSegment = function (index) {
    if (index < this._segments.length) {
        var segment = this._segments[index];
        return{property: segment.property, forward: segment.forward, isArray: segment.isArray};
    } else {
        return null;
    }
};
Exhibit.Expression.Path.prototype.getLastSegment = function () {
    return this.getSegment(this._segments.length - 1);
};
Exhibit.Expression.Path.prototype.getSegmentCount = function () {
    return this._segments.length;
};
Exhibit.Expression.Path.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    var rootName = this._rootName != null ? this._rootName : defaultRootName;
    var valueType = rootName in rootValueTypes ? rootValueTypes[rootName] : "text";
    var collection = null;
    if (rootName in roots) {
        var root = roots[rootName];
        if (root instanceof Exhibit.Set || root instanceof Array) {
            collection = new Exhibit.Expression._Collection(root, valueType);
        } else {
            collection = new Exhibit.Expression._Collection([root], valueType);
        }
        return this._walkForward(collection, database);
    } else {
        throw new Error("No such variable called " + rootName);
    }
};
Exhibit.Expression.Path.prototype.evaluateBackward = function (value, valueType, filter, database) {
    var collection = new Exhibit.Expression._Collection([value], valueType);
    return this._walkBackward(collection, filter, database);
};
Exhibit.Expression.Path.prototype.walkForward = function (values, valueType, database) {
    return this._walkForward(new Exhibit.Expression._Collection(values, valueType), database);
};
Exhibit.Expression.Path.prototype.walkBackward = function (values, valueType, filter, database) {
    return this._walkBackward(new Exhibit.Expression._Collection(values, valueType), filter, database);
};
Exhibit.Expression.Path.prototype._walkForward = function (collection, database) {
    for (var i = 0;
         i < this._segments.length;
         i++) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function (v) {
                    database.getObjects(v, segment.property).visit(function (v2) {
                        a.push(v2);
                    });
                });
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function (v) {
                    database.getSubjects(v, segment.property).visit(function (v2) {
                        a.push(v2);
                    });
                });
                valueType = "item";
            }
            collection = new Exhibit.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getObjectsUnion(collection.getSet(), segment.property);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new Exhibit.Expression._Collection(values, valueType);
            } else {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property);
                collection = new Exhibit.Expression._Collection(values, "item");
            }
        }
    }
    return collection;
};
Exhibit.Expression.Path.prototype._walkBackward = function (collection, filter, database) {
    for (var i = this._segments.length - 1;
         i >= 0;
         i--) {
        var segment = this._segments[i];
        if (segment.isArray) {
            var a = [];
            var valueType;
            if (segment.forward) {
                collection.forEachValue(function (v) {
                    database.getSubjects(v, segment.property).visit(function (v2) {
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2);
                        }
                    });
                });
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            } else {
                collection.forEachValue(function (v) {
                    database.getObjects(v, segment.property).visit(function (v2) {
                        if (i > 0 || filter == null || filter.contains(v2)) {
                            a.push(v2);
                        }
                    });
                });
                valueType = "item";
            }
            collection = new Exhibit.Expression._Collection(a, valueType);
        } else {
            if (segment.forward) {
                var values = database.getSubjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                collection = new Exhibit.Expression._Collection(values, "item");
            } else {
                var values = database.getObjectsUnion(collection.getSet(), segment.property, null, i == 0 ? filter : null);
                var property = database.getProperty(segment.property);
                var valueType = property != null ? property.getValueType() : "text";
                collection = new Exhibit.Expression._Collection(values, valueType);
            }
        }
    }
    return collection;
};
Exhibit.Expression.Path.prototype.rangeBackward = function (from, to, inclusive, filter, database) {
    var set = new Exhibit.Set();
    var valueType = "item";
    if (this._segments.length > 0) {
        var segment = this._segments[this._segments.length - 1];
        if (segment.forward) {
            database.getSubjectsInRange(segment.property, from, to, inclusive, set, this._segments.length == 1 ? filter : null);
        } else {
            throw new Error("Last path of segment must be forward");
        }
        for (var i = this._segments.length - 2;
             i >= 0;
             i--) {
            segment = this._segments[i];
            if (segment.forward) {
                set = database.getSubjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                valueType = "item";
            } else {
                set = database.getObjectsUnion(set, segment.property, null, i == 0 ? filter : null);
                var property = database.getProperty(segment.property);
                valueType = property != null ? property.getValueType() : "text";
            }
        }
    }
    return{valueType: valueType, values: set, count: set.size()};
};
Exhibit.Expression.Path.prototype.testExists = function (roots, rootValueTypes, defaultRootName, database) {
    return this.evaluate(roots, rootValueTypes, defaultRootName, database).size > 0;
};
Exhibit.Expression._Constant = function (value, valueType) {
    this._value = value;
    this._valueType = valueType;
};
Exhibit.Expression._Constant.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    return new Exhibit.Expression._Collection([this._value], this._valueType);
};
Exhibit.Expression._Operator = function (operator, args) {
    this._operator = operator;
    this._args = args;
};
Exhibit.Expression._Operator.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    var values = [];
    var args = [];
    for (var i = 0;
         i < this._args.length;
         i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    var operator = Exhibit.Expression._operators[this._operator];
    var f = operator.f;
    if (operator.argumentType == "number") {
        args[0].forEachValue(function (v1) {
            if (!(typeof v1 == "number")) {
                v1 = parseFloat(v1);
            }
            args[1].forEachValue(function (v2) {
                if (!(typeof v2 == "number")) {
                    v2 = parseFloat(v2);
                }
                values.push(f(v1, v2));
            });
        });
    } else {
        args[0].forEachValue(function (v1) {
            args[1].forEachValue(function (v2) {
                values.push(f(v1, v2));
            });
        });
    }
    return new Exhibit.Expression._Collection(values, operator.valueType);
};
Exhibit.Expression._operators = {"+": {argumentType: "number", valueType: "number", f: function (a, b) {
    return a + b;
}}, "-": {argumentType: "number", valueType: "number", f: function (a, b) {
    return a - b;
}}, "*": {argumentType: "number", valueType: "number", f: function (a, b) {
    return a * b;
}}, "/": {argumentType: "number", valueType: "number", f: function (a, b) {
    return a / b;
}}, "=": {valueType: "boolean", f: function (a, b) {
    return a == b;
}}, "<>": {valueType: "boolean", f: function (a, b) {
    return a != b;
}}, "><": {valueType: "boolean", f: function (a, b) {
    return a != b;
}}, "<": {argumentType: "number", valueType: "boolean", f: function (a, b) {
    return a < b;
}}, ">": {argumentType: "number", valueType: "boolean", f: function (a, b) {
    return a > b;
}}, "<=": {argumentType: "number", valueType: "boolean", f: function (a, b) {
    return a <= b;
}}, ">=": {argumentType: "number", valueType: "boolean", f: function (a, b) {
    return a >= b;
}}};
Exhibit.Expression._FunctionCall = function (name, args) {
    this._name = name;
    this._args = args;
};
Exhibit.Expression._FunctionCall.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    var args = [];
    for (var i = 0;
         i < this._args.length;
         i++) {
        args.push(this._args[i].evaluate(roots, rootValueTypes, defaultRootName, database));
    }
    if (this._name in Exhibit.Functions) {
        return Exhibit.Functions[this._name].f(args);
    } else {
        throw new Error("No such function named " + this._name);
    }
};
Exhibit.Expression._ControlCall = function (name, args) {
    this._name = name;
    this._args = args;
};
Exhibit.Expression._ControlCall.prototype.evaluate = function (roots, rootValueTypes, defaultRootName, database) {
    return Exhibit.Controls[this._name].f(this._args, roots, rootValueTypes, defaultRootName, database);
};


/* functions.js */
Exhibit.Functions = {};
Exhibit.FunctionUtilities = {};
Exhibit.FunctionUtilities.registerSimpleMappingFunction = function (name, f, valueType) {
    Exhibit.Functions[name] = {f: function (args) {
        var set = new Exhibit.Set();
        for (var i = 0;
             i < args.length;
             i++) {
            args[i].forEachValue(function (v) {
                var v2 = f(v);
                if (v2 != undefined) {
                    set.add(v2);
                }
            });
        }
        return new Exhibit.Expression._Collection(set, valueType);
    }};
};
Exhibit.Functions["union"] = {f: function (args) {
    var set = new Exhibit.Set();
    var valueType = null;
    if (args.length > 0) {
        var valueType = args[0].valueType;
        for (var i = 0;
             i < args.length;
             i++) {
            var arg = args[i];
            if (arg.size > 0) {
                if (valueType == null) {
                    valueType = arg.valueType;
                }
                set.addSet(arg.getSet());
            }
        }
    }
    return new Exhibit.Expression._Collection(set, valueType != null ? valueType : "text");
}};
Exhibit.Functions["contains"] = {f: function (args) {
    var result = args[0].size > 0;
    var set = args[0].getSet();
    args[1].forEachValue(function (v) {
        if (!set.contains(v)) {
            result = false;
            return true;
        }
    });
    return new Exhibit.Expression._Collection([result], "boolean");
}};
Exhibit.Functions["exists"] = {f: function (args) {
    return new Exhibit.Expression._Collection([args[0].size > 0], "boolean");
}};
Exhibit.Functions["count"] = {f: function (args) {
    return new Exhibit.Expression._Collection([args[0].size], "number");
}};
Exhibit.Functions["not"] = {f: function (args) {
    return new Exhibit.Expression._Collection([!args[0].contains(true)], "boolean");
}};
Exhibit.Functions["and"] = {f: function (args) {
    var r = true;
    for (var i = 0;
         r && i < args.length;
         i++) {
        r = r && args[i].contains(true);
    }
    return new Exhibit.Expression._Collection([r], "boolean");
}};
Exhibit.Functions["or"] = {f: function (args) {
    var r = false;
    for (var i = 0;
         !r && i < args.length;
         i++) {
        r = r || args[i].contains(true);
    }
    return new Exhibit.Expression._Collection([r], "boolean");
}};
Exhibit.Functions["add"] = {f: function (args) {
    var total = 0;
    for (var i = 0;
         i < args.length;
         i++) {
        args[i].forEachValue(function (v) {
            if (v != null) {
                if (typeof v == "number") {
                    total += v;
                } else {
                    var n = parseFloat(v);
                    if (!isNaN(n)) {
                        total += n;
                    }
                }
            }
        });
    }
    return new Exhibit.Expression._Collection([total], "number");
}};
Exhibit.Functions["concat"] = {f: function (args) {
    var result = [];
    for (var i = 0;
         i < args.length;
         i++) {
        args[i].forEachValue(function (v) {
            if (v != null) {
                result.push(v);
            }
        });
    }
    return new Exhibit.Expression._Collection([result.join("")], "text");
}};
Exhibit.Functions["multiply"] = {f: function (args) {
    var product = 1;
    for (var i = 0;
         i < args.length;
         i++) {
        args[i].forEachValue(function (v) {
            if (v != null) {
                if (typeof v == "number") {
                    product *= v;
                } else {
                    var n = parseFloat(v);
                    if (!isNaN(n)) {
                        product *= n;
                    }
                }
            }
        });
    }
    return new Exhibit.Expression._Collection([product], "number");
}};
Exhibit.Functions["date-range"] = {_parseDate: function (v) {
    if (v == null) {
        return Number.NEGATIVE_INFINITY;
    } else {
        if (v instanceof Date) {
            return v.getTime();
        } else {
            try {
                return SimileAjax.DateTime.parseIso8601DateTime(v).getTime();
            } catch (e) {
                return Number.NEGATIVE_INFINITY;
            }
        }
    }
}, _factors: {second: 1000, minute: 60 * 1000, hour: 60 * 60 * 1000, day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000, quarter: 3 * 30 * 24 * 60 * 60 * 1000, year: 365 * 24 * 60 * 60 * 1000, decade: 10 * 365 * 24 * 60 * 60 * 1000, century: 100 * 365 * 24 * 60 * 60 * 1000}, _computeRange: function (from, to, interval) {
    var range = to - from;
    if (isFinite(range)) {
        if (interval in this._factors) {
            range = Math.round(range / this._factors[interval]);
        }
        return range;
    }
    return null;
}, f: function (args) {
    var self = this;
    var from = Number.POSITIVE_INFINITY;
    args[0].forEachValue(function (v) {
        from = Math.min(from, self._parseDate(v));
    });
    var to = Number.NEGATIVE_INFINITY;
    args[1].forEachValue(function (v) {
        to = Math.max(to, self._parseDate(v));
    });
    var interval = "day";
    args[2].forEachValue(function (v) {
        interval = v;
    });
    var range = this._computeRange(from, to, interval);
    return new Exhibit.Expression._Collection(range != null ? [range] : [], "number");
}};
Exhibit.Functions["distance"] = {_units: {km: 1000, mile: 1609.344}, _computeDistance: function (from, to, unit, roundTo) {
    var range = from.distanceFrom(to);
    if (!roundTo) {
        roundTo = 1;
    }
    if (isFinite(range)) {
        if (this._units.hasOwnProperty(unit)) {
            range = range / this._units[unit];
        }
        return Exhibit.Util.round(range, roundTo);
    }
    return null;
}, f: function (args) {
    var self = this;
    var data = {};
    var name = ["origo", "lat", "lng", "unit", "round"];
    for (var i = 0, n;
         n = name[i];
         i++) {
        args[i].forEachValue(function (v) {
            data[n] = v;
        });
    }
    var latlng = data.origo.split(",");
    var from = new GLatLng(latlng[0], latlng[1]);
    var to = new GLatLng(data.lat, data.lng);
    var range = this._computeDistance(from, to, data.unit, data.round);
    return new Exhibit.Expression._Collection(range != null ? [range] : [], "number");
}};
Exhibit.Functions["min"] = {f: function (args) {
    var returnMe = function (val) {
        return val;
    };
    var min = Number.POSITIVE_INFINITY;
    var valueType = null;
    for (var i = 0;
         i < args.length;
         i++) {
        var arg = args[i];
        var currentValueType = arg.valueType ? arg.valueType : "text";
        var parser = Exhibit.SettingsUtilities._typeToParser(currentValueType);
        arg.forEachValue(function (v) {
            parsedV = parser(v, returnMe);
            if (parsedV < min || min == Number.POSITIVE_INFINITY) {
                min = parsedV;
                valueType = (valueType == null) ? currentValueType : (valueType == currentValueType ? valueType : "text");
            }
        });
    }
    return new Exhibit.Expression._Collection([min], valueType != null ? valueType : "text");
}};
Exhibit.Functions["max"] = {f: function (args) {
    var returnMe = function (val) {
        return val;
    };
    var max = Number.NEGATIVE_INFINITY;
    var valueType = null;
    for (var i = 0;
         i < args.length;
         i++) {
        var arg = args[i];
        var currentValueType = arg.valueType ? arg.valueType : "text";
        var parser = Exhibit.SettingsUtilities._typeToParser(currentValueType);
        arg.forEachValue(function (v) {
            parsedV = parser(v, returnMe);
            if (parsedV > max || max == Number.NEGATIVE_INFINITY) {
                max = parsedV;
                valueType = (valueType == null) ? currentValueType : (valueType == currentValueType ? valueType : "text");
            }
        });
    }
    return new Exhibit.Expression._Collection([max], valueType != null ? valueType : "text");
}};
Exhibit.Functions["remove"] = {f: function (args) {
    var set = args[0].getSet();
    var valueType = args[0].valueType;
    for (var i = 1;
         i < args.length;
         i++) {
        var arg = args[i];
        if (arg.size > 0) {
            set.removeSet(arg.getSet());
        }
    }
    return new Exhibit.Expression._Collection(set, valueType);
}};
Exhibit.Functions["now"] = {f: function (args) {
    return new Exhibit.Expression._Collection([new Date()], "date");
}};


/* authenticated-importer.js */
Exhibit.AuthenticatedImporter = {_callbacks: {}};
Exhibit.importers["application/authenticated"] = Exhibit.AuthenticatedImporter;
Exhibit.AuthenticatedImporter.constructURL = function () {
    return"https://www.google.com/accounts/AuthSubRequest?scope=http%3A%2F%2Fspreadsheets.google.com%2Ffeeds%2F&session=1&secure=0&next=" + window.location;
};
Exhibit.AuthenticatedImporter.load = function (link, database, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);
    var fError = function (statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) {
            cont();
        }
    };
    var fDone = function (xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        try {
            var o = null;
            try {
                o = eval("(" + xmlhttp.responseText + ")");
            } catch (e) {
                Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
            }
            if (o != null) {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Error loading Exhibit JSON data from " + url);
        } finally {
            if (cont) {
                cont();
            }
        }
    };
    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};


/* babel-based-importer.js */
Exhibit.BabelBasedImporter = {mimetypeToReader: {"application/rdf+xml": "rdf-xml", "application/n3": "n3", "application/msexcel": "xls", "application/x-msexcel": "xls", "application/x-ms-excel": "xls", "application/vnd.ms-excel": "xls", "application/x-excel": "xls", "application/xls": "xls", "application/x-xls": "xls", "application/x-bibtex": "bibtex"}, babelTranslatorURL: "http://service.simile-widgets.org/babel/translator", _initialize: function () {
    var links = [];
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0;
         h < heads.length;
         h++) {
        var linkElmts = heads[h].getElementsByTagName("link");
        for (var l = 0;
             l < linkElmts.length;
             l++) {
            var link = linkElmts[l];
            if (link.rel.match(/\bexhibit\/babel-translator\b/)) {
                Exhibit.BabelBasedImporter.babelTranslatorURL = link.href;
            }
        }
    }
    Exhibit.BabelBasedImporter._initialize = function () {
    };
}};
Exhibit.importers["application/rdf+xml"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/n3"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/msexcel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-msexcel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/vnd.ms-excel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-excel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/xls"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-xls"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-bibtex"] = Exhibit.BabelBasedImporter;
Exhibit.BabelBasedImporter.load = function (link, database, cont) {
    Exhibit.BabelBasedImporter._initialize();
    var url = (typeof link == "string") ? Exhibit.Persistence.resolveURL(link) : Exhibit.Persistence.resolveURL(link.href);
    var reader = "rdf-xml";
    var writer = "exhibit-jsonp";
    if (typeof link != "string") {
        var mimetype = link.type;
        if (mimetype in Exhibit.BabelBasedImporter.mimetypeToReader) {
            reader = Exhibit.BabelBasedImporter.mimetypeToReader[mimetype];
        }
    }
    if (reader == "bibtex") {
        writer = "bibtex-exhibit-jsonp";
    }
    var babelURL = Exhibit.BabelBasedImporter.babelTranslatorURL + "?" + ["reader=" + reader, "writer=" + writer, "url=" + encodeURIComponent(url)].join("&");
    return Exhibit.JSONPImporter.load(babelURL, database, cont);
};


/* exhibit-json-importer.js */
Exhibit.ExhibitJSONImporter = {};
Exhibit.importers["application/json"] = Exhibit.ExhibitJSONImporter;
Exhibit.ExhibitJSONImporter.parse = function (content, link, url) {
    var o = null;
    try {
        o = eval("(" + content + ")");
    } catch (e) {
        Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
    }
    return o;
};
Exhibit.ExhibitJSONImporter.load = function (link, database, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);
    var fError = function (statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) {
            cont();
        }
    };
    var fDone = function (xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        var o = Exhibit.JSONImporter.parse(xmlhttp.responseText, link, url);
        if (o != null) {
            try {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            } catch (e) {
                SimileAjax.Debug.exception(e, "Error loading Exhibit JSON data from " + url);
            }
        }
        if (cont) {
            cont();
        }
    };
    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};


/* html-table-importer.js */
Exhibit.HtmlTableImporter = {};
Exhibit.importers["text/html"] = Exhibit.HtmlTableImporter;
Exhibit.ProxyGetter = function (link, database, parser, cont) {
    var url = typeof link == "string" ? link : link.href;
    if (typeof link != "string") {
        var xpath = link.getAttribute("ex:xpath");
    }
    var babelURL = "http://service.simile-widgets.org/babel/html-extractor?url=" + encodeURIComponent(url);
    if (xpath) {
        babelURL += "xpath=" + xpath;
    }
    var fConvert = function (string) {
        var div = document.createElement("div");
        div.innerHTML = string;
        var e = div.firstChild;
        var string = string.slice(string.search(/<BODY>/) + 6, string.search(/<\/BODY>/));
        return parser(string, link);
    };
    return Exhibit.JSONPImporter.load(babelURL, database, cont, fConvert);
};
Exhibit.HtmlTableImporter.parse = function (table, link, url) {
    var $ = SimileAjax.jQuery;
    var jq = $(table);
    table = jq.get(0);
    var readAttributes = function (node, attributes) {
        var result = {}, found = false, attr, value, i;
        for (i = 0;
             attr = attributes[i];
             i++) {
            value = Exhibit.getAttribute(node, attr);
            if (value) {
                result[attr] = value;
                found = true;
            }
        }
        return found && result;
    };
    var typelist = ["uri", "label", "pluralLabel"];
    var proplist = ["uri", "valueType", "label", "reverseLabel", "pluralLabel", "reversePluralLabel", "groupingLabel", "reverseGroupingLabel"];
    var columnProplist = ["valueParser", "arity", "hrefProperty", "srcProperty"];
    var types = {}, properties = {};
    var type = Exhibit.getAttribute(link, "itemType");
    var typeSchema = type && readAttributes(link, typelist);
    var separator = Exhibit.getAttribute(link, "separator") || ";";
    if (typeSchema) {
        types[type] = types;
    }
    var columns = Exhibit.getAttribute(link, "property");
    var columnAttrs = [];
    var headerRow = Exhibit.getAttribute(link, "headerRow");
    if (columns) {
        columns = columns.split(",");
    } else {
        var hasProps = function () {
            return Exhibit.getAttribute(this, "property");
        };
        if (jq.find("col").filter(hasProps).length > 0) {
            columns = jq.find("col");
        } else {
            headerRow = true;
            columns = jq.find("tr").eq(0).children();
        }
        columns = columns.map(function (i) {
            var property = Exhibit.getAttribute(this, "property") || $(this).text();
            var propSchema = readAttributes(this, proplist);
            if (propSchema && property) {
                properties[property] = propSchema;
            }
            columnAttrs[i] = readAttributes(this, columnProplist) || {};
            return property;
        }).get();
    }
    var rows = jq.find("tr");
    if (headerRow) {
        rows = rows.slice(1);
    }
    rows = rows.filter(":has(td)");
    var parseRow = function () {
        var item = {};
        var fields = $("td", this);
        fields.each(function (i) {
            var prop = columns[i];
            if (prop) {
                var attrs = columnAttrs[i];
                if (attrs.valueParser) {
                    item[prop] = attrs.valueParser(this);
                } else {
                    if (attrs.hrefProperty || attrs.srcProperty) {
                        item[prop] = $(this).text();
                    } else {
                        item[prop] = $(this).html();
                    }
                    if (attrs.arity != "single") {
                        item[prop] = item[prop].split(separator);
                    }
                }
            }
            if (attrs.hrefProperty) {
                item[attrs.hrefProperty] = $("[href]", this).attr("href");
            }
            if (attrs.srcProperty) {
                item[attrs.srcProperty] = $("[src]", this).attr("src");
            }
            if (type) {
                item.type = type;
            }
        });
        return item;
    };
    var items = rows.map(parseRow).get();
    return({types: types, properties: properties, items: items});
};


/* json-importer.js */
Exhibit.JSONImporter = {};
Exhibit.importers["application/general-json"] = Exhibit.JSONImporter;
Exhibit.JSONImporter.getjsonDocument = function (docURL) {
    var jsonDoc = null;
    $.ajax({url: docURL, type: "GET", dataType: "json", async: false, success: function (data) {
        jsonDoc = data;
    }});
    if (jsonDoc) {
        return jsonDoc;
    } else {
        alert("ERROR FINDING JSON DOC");
        return null;
    }
};
Exhibit.JSONImporter.findFirstItems = function (json, configuration) {
    if (json instanceof Array) {
        return json.length > 0 ? Exhibit.JSONImporter.findFirstItems(json[0], configuration) : null;
    } else {
        var visited = [];
        var listOfItems = [];
        for (child in json) {
            visited.push(json[child]);
            if (configuration.itemTag.indexOf(child) >= 0) {
                for (var i = 0;
                     i < json[child].length;
                     i++) {
                    var subChild = json[child][i];
                    subChild.index = configuration.itemTag.indexOf(child);
                    listOfItems.push(subChild);
                }
            }
        }
        if (listOfItems.length) {
            return listOfItems;
        } else {
            return Exhibit.JSONImporter.findFirstItems(visited, configuration);
        }
    }
};
Exhibit.JSONImporter.getItems = function (json, exhibitJSON, configuration) {
    var itemQueue;
    var root = json;
    if (root instanceof Array) {
        itemQueue = root;
    } else {
        itemQueue = [root];
    }
    while (itemQueue.length > 0) {
        var myObject = itemQueue.shift();
        var index = myObject.index;
        var objectToAppend = {};
        var propertyQueue = [];
        for (propertyKey in myObject) {
            propertyQueue.push(propertyKey);
        }
        while (propertyQueue.length > 0) {
            var key = propertyQueue.shift();
            var keyID = key.split(".").pop();
            if (configuration.itemTag.indexOf(keyID) == -1) {
                var propertyValue = eval("myObject." + key);
                if (keyID == "index") {
                } else {
                    if (propertyValue instanceof Array) {
                        objectToAppend[keyID] = propertyValue;
                    } else {
                        if (propertyValue instanceof Object) {
                            for (newProperty in propertyValue) {
                                propertyQueue.push(key + "." + newProperty);
                            }
                        } else {
                            if (keyID == configuration.propertyTags[index]) {
                                var referenceIndex = configuration.propertyTags.indexOf(keyID);
                                var newKey = configuration.propertyNames[referenceIndex];
                                objectToAppend[newKey] = propertyValue;
                            } else {
                                if (keyID == configuration.propertyLabel[index]) {
                                    objectToAppend.label = propertyValue;
                                } else {
                                    objectToAppend[keyID] = propertyValue;
                                }
                            }
                        }
                    }
                }
                if (configuration.itemType[index]) {
                    objectToAppend.type = configuration.itemType[index];
                } else {
                    objectToAppend.type = "Item";
                }
            } else {
                newObject = eval("myObject." + key);
                if (newObject instanceof Array) {
                    for (var i = 0;
                         i < newObject.length;
                         i++) {
                        var object = newObject[i];
                        object.index = configuration.itemTag.indexOf(keyID);
                        if (configuration.parentRelation[object.index]) {
                            object[configuration.parentRelation[object.index]] = objectToAppend.label;
                        } else {
                            object["is a child of"] = objectToAppend.label;
                        }
                        itemQueue.push(object);
                    }
                } else {
                    newObject.index = configuration.itemTag.indexOf(keyID);
                    if (configuration.parentRelation[newObject.index]) {
                        newObject[configuration.parentRelation[newObject.index]] = objectToAppend.label;
                    } else {
                        newObject["isChildOf"] = objectToAppend.label;
                    }
                    itemQueue.push(newObject);
                }
            }
        }
        exhibitJSON.items.push(objectToAppend);
    }
    return exhibitJSON;
};
Exhibit.JSONImporter.configure = function () {
    var configuration = {"itemTag": [], "propertyLabel": [], "itemType": [], "parentRelation": [], "propertyTags": [], "propertyNames": []};
    $("link").each(function () {
        if (this.hasAttribute("ex:itemTags")) {
            configuration.itemTag = Exhibit.getAttribute(this, "ex:itemTags", ",");
        }
        if (this.hasAttribute("ex:propertyLabels")) {
            configuration.propertyLabel = Exhibit.getAttribute(this, "ex:propertyLabels", ",");
        }
        if (this.hasAttribute("ex:itemTypes")) {
            configuration.itemType = Exhibit.getAttribute(this, "ex:itemTypes", ",");
        }
        if (this.hasAttribute("ex:parentRelations")) {
            configuration.parentRelation = Exhibit.getAttribute(this, "ex:parentRelations", ",");
        }
        if (this.hasAttribute("ex:propertyNames")) {
            configuration.propertyNames = Exhibit.getAttribute(this, "ex:propertyNames", ",");
        }
        if (this.hasAttribute("ex:propertyTags")) {
            configuration.propertyTags = Exhibit.getAttribute(this, "ex:propertyTags", ",");
        }
    });
    return configuration;
};
Exhibit.JSONImporter.load = function (link, database, cont) {
    var self = this;
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);
    var fError = function (statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) {
            cont();
        }
    };
    var fDone = function () {
        Exhibit.UI.hideBusyIndicator();
        try {
            var o = null;
            try {
                jsonDoc = Exhibit.JSONImporter.getjsonDocument(url);
                var configuration = self.configure();
                o = {"items": []};
                var root = self.findFirstItems(jsonDoc, configuration);
                o = Exhibit.JSONImporter.getItems(root, o, configuration);
            } catch (e) {
                Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
            }
            if (o != null) {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Error loading Exhibit JSON data from " + url);
        } finally {
            if (cont) {
                cont();
            }
        }
    };
    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};


/* jsonp-importer.js */
Exhibit.JSONPImporter = {_callbacks: {}};
Exhibit.importers["application/jsonp"] = Exhibit.JSONPImporter;
Exhibit.JSONPImporter.getter = function (link, database, parser, cont) {
    var fConvert = function (json, url, link) {
        parser(json, link, url);
    };
    Exhibit.JSONPImporter.load(link, database, cont, fConvert);
};
Exhibit.JSONPImporter.load = function (link, database, cont, fConvert, staticJSONPCallback, charset) {
    var url = link;
    if (typeof link != "string") {
        url = Exhibit.Persistence.resolveURL(link.href);
        fConvert = Exhibit.getAttribute(link, "converter");
        staticJSONPCallback = Exhibit.getAttribute(link, "jsonp-callback");
        charset = Exhibit.getAttribute(link, "charset");
    }
    if (typeof fConvert == "string") {
        var name = fConvert;
        name = name.charAt(0).toLowerCase() + name.substring(1) + "Converter";
        if (name in Exhibit.JSONPImporter) {
            fConvert = Exhibit.JSONPImporter[name];
        } else {
            try {
                fConvert = eval(fConvert);
            } catch (e) {
                fConvert = null;
            }
        }
    }
    if (fConvert != null && "preprocessURL" in fConvert) {
        url = fConvert.preprocessURL(url);
    }
    var next = Exhibit.JSONPImporter._callbacks.next || 1;
    Exhibit.JSONPImporter._callbacks.next = next + 1;
    var callbackName = "cb" + next.toString(36);
    var callbackURL = url;
    if (callbackURL.indexOf("?") == -1) {
        callbackURL += "?";
    }
    var lastChar = callbackURL.charAt(callbackURL.length - 1);
    if (lastChar != "=") {
        if (lastChar != "&" && lastChar != "?") {
            callbackURL += "&";
        }
        callbackURL += "callback=";
    }
    var callbackFull = "Exhibit.JSONPImporter._callbacks." + callbackName;
    callbackURL += callbackFull;
    var cleanup = function (failedURL) {
        try {
            Exhibit.UI.hideBusyIndicator();
            delete Exhibit.JSONPImporter._callbacks[callbackName + "_fail"];
            delete Exhibit.JSONPImporter._callbacks[callbackName];
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        } finally {
            if (failedURL) {
                prompt("Failed to load javascript file:", failedURL);
                cont && cont(undefined);
            }
        }
    };
    Exhibit.JSONPImporter._callbacks[callbackName + "_fail"] = cleanup;
    Exhibit.JSONPImporter._callbacks[callbackName] = function (json) {
        try {
            cleanup(null);
            database.loadData(fConvert ? fConvert(json, url, link) : json, Exhibit.Persistence.getBaseURL(url));
        } finally {
            if (cont) {
                cont(json);
            }
        }
    };
    if (staticJSONPCallback) {
        callbackURL = url;
        eval(staticJSONPCallback + "=" + callbackFull);
    }
    var fail = callbackFull + "_fail('" + callbackURL + "');";
    var script = SimileAjax.includeJavascriptFile(document, callbackURL, fail, charset);
    Exhibit.UI.showBusyIndicator();
    return Exhibit.JSONPImporter._callbacks[callbackName];
};
Exhibit.JSONPImporter.transformJSON = function (json, index, mapping, converters) {
    var objects = json, items = [];
    if (index) {
        index = index.split(".");
        while (index.length) {
            objects = objects[index.shift()];
        }
    }
    for (var i = 0, object;
         object = objects[i];
         i++) {
        var item = {};
        for (var name in mapping) {
            if (mapping.hasOwnProperty(name)) {
                var index = mapping[name].split(".");
                for (var property = object;
                     index.length && property;
                     property = property[index.shift()]) {
                }
                if (property && converters && converters.hasOwnProperty(name)) {
                    property = converters[name](property, object, i, objects, json);
                }
                if (typeof property != "undefined") {
                    item[name] = property;
                }
            }
        }
        items.push(item);
    }
    return items;
};
Exhibit.JSONPImporter.deliciousConverter = function (json, url) {
    var items = Exhibit.JSONPImporter.transformJSON(json, null, {label: "u", note: "n", description: "d", tags: "t"});
    return{items: items, properties: {url: {valueType: "url"}}};
};
Exhibit.JSONPImporter.googleSpreadsheetsConverter = function (json, url, link) {
    var separator = ";";
    if ((link) && (typeof link != "string")) {
        var s = Exhibit.getAttribute(link, "separator");
        if (s != null && s.length > 0) {
            separator = s;
        }
    }
    var items = [];
    var properties = {};
    var types = {};
    var valueTypes = {"text": true, "number": true, "item": true, "url": true, "boolean": true, "date": true};
    var entries = json.feed.entry || [];
    for (var i = 0;
         i < entries.length;
         i++) {
        var entry = entries[i];
        var id = entry.id.$t;
        var c = id.lastIndexOf("C");
        var r = id.lastIndexOf("R");
        entries[i] = {row: parseInt(id.substring(r + 1, c)) - 1, col: parseInt(id.substring(c + 1)) - 1, val: entry.content.$t};
    }
    var cellIndex = 0;
    var getNextRow = function () {
        if (cellIndex < entries.length) {
            var firstEntry = entries[cellIndex++];
            var row = [firstEntry];
            while (cellIndex < entries.length) {
                var nextEntry = entries[cellIndex];
                if (nextEntry.row == firstEntry.row) {
                    row.push(nextEntry);
                    cellIndex++;
                } else {
                    break;
                }
            }
            return row;
        }
        return null;
    };
    var propertyRow = getNextRow();
    if (propertyRow != null) {
        var propertiesByColumn = [];
        for (var i = 0;
             i < propertyRow.length;
             i++) {
            var cell = propertyRow[i];
            var fieldSpec = cell.val.trim().replace(/^\{/g, "").replace(/\}$/g, "").split(":");
            var fieldName = fieldSpec[0].trim();
            var fieldDetails = fieldSpec.length > 1 ? fieldSpec[1].split(",") : [];
            var property = {single: false};
            for (var d = 0;
                 d < fieldDetails.length;
                 d++) {
                var detail = fieldDetails[d].trim();
                if (detail in valueTypes) {
                    property.valueType = detail;
                } else {
                    if (detail == "single") {
                        property.single = true;
                    }
                }
            }
            propertiesByColumn[cell.col] = fieldName;
            properties[fieldName] = property;
        }
        var row = null;
        while ((row = getNextRow()) != null) {
            var item = {};
            for (var i = 0;
                 i < row.length;
                 i++) {
                var cell = row[i];
                var fieldName = propertiesByColumn[cell.col];
                if (typeof fieldName == "string") {
                    var googleDocsDateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                    if (googleDocsDateRegex.exec(cell.val)) {
                        cell.val = Exhibit.Database.makeISO8601DateString(new Date(cell.val));
                    }
                    item[fieldName] = cell.val;
                    var property = properties[fieldName];
                    if (!property.single) {
                        var fieldValues = cell.val.split(separator);
                        for (var v = 0;
                             v < fieldValues.length;
                             v++) {
                            fieldValues[v] = fieldValues[v].trim();
                        }
                        item[fieldName] = fieldValues;
                    } else {
                        item[fieldName] = cell.val.trim();
                    }
                }
            }
            items.push(item);
        }
    }
    return{types: types, properties: properties, items: items};
};
Exhibit.JSONPImporter.googleSpreadsheetsConverter.preprocessURL = function (url) {
    return url.replace(/\/list\//g, "/cells/");
};


/* rdfa-importer.js */
var RDFA = new Object();
RDFA.url = "http://www.w3.org/2006/07/SWD/RDFa/impl/js/20070301/rdfa.js";
Exhibit.RDFaImporter = {};
Exhibit.importers["application/RDFa"] = Exhibit.RDFaImporter;
Exhibit.RDFaImporter.load = function (link, database, cont) {
    try {
        if ((link.getAttribute("href") || "").length == 0) {
            Exhibit.RDFaImporter.loadRDFa(null, document, database);
        } else {
            iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.setAttribute("onLoad", "Exhibit.RDFaImporter.loadRDFa(this, this.contentDocument, database)");
            iframe.src = link.href;
            document.body.appendChild(iframe);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e);
    } finally {
        if (cont) {
            cont();
        }
    }
};
Exhibit.RDFaImporter.loadRDFa = function (iframe, rdfa, database) {
    var textOf = function (n) {
        return n.textContent || n.innerText || "";
    };
    var readAttributes = function (node, attributes) {
        var result = {}, found = false, attr, value, i;
        for (i = 0;
             attr = attributes[i];
             i++) {
            value = Exhibit.getAttribute(node, attr);
            if (value) {
                result[attr] = value;
                found = true;
            }
        }
        return found && result;
    };
    RDFA.CALLBACK_DONE_PARSING = function () {
        if (iframe != null) {
            document.body.removeChild(iframe);
        }
        this.cloneObject = function (what) {
            for (var i in what) {
                this[i] = what[i];
            }
        };
        var triples = this.triples;
        var parsed = {"classes": {}, "properties": {}, "items": []};
        for (var i in triples) {
            var item = {};
            item["id"], item["uri"], item["label"] = i;
            var tri = triples[i];
            for (var j in tri) {
                for (var k = 0;
                     k < tri[j].length;
                     k++) {
                    if (tri[j][k].predicate.ns) {
                        var p_label = tri[j][k].predicate.ns.prefix + ":" + tri[j][k].predicate.suffix;
                        if (j == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
                            try {
                                var type_uri = tri[j][k]["object"];
                                var matches = type_uri.match(/(.+?)(#|\/)([a-zA-Z_]+)?$/);
                                var type_label = matches[3] + "(" + matches[1] + ")";
                                parsed["classes"][type_label] = {"label": type_label, "uri": type_uri};
                                item["type"] = type_label;
                            } catch (e) {
                            }
                        } else {
                            parsed["properties"][p_label] = {"uri": j, "label": tri[j][k]["predicate"]["suffix"]};
                            try {
                                if (!item[p_label]) {
                                    item[p_label] = [];
                                }
                                item[p_label].push(tri[j][k]["object"]);
                            } catch (e) {
                                SimileAjax.Debug.log("problem adding property value: " + e);
                            }
                            if (j == "http://purl.org/dc/elements/1.1/title" || j == "http://www.w3.org/2000/01/rdf-schema#" || j == "http://xmlns.com/foaf/0.1/name") {
                                item.label = item[p_label];
                            }
                        }
                    } else {
                        item[j] = tri[j][k]["object"];
                    }
                }
            }
            parsed["items"].push(new this.cloneObject(item));
        }
        database.loadData(parsed, Exhibit.Persistence.getBaseURL(document.location.href));
    };
    RDFA.CALLBACK_DONE_LOADING = function () {
        RDFA.parse(rdfa);
    };
    SimileAjax.includeJavascriptFile(document, RDFA.url);
};


/* tsv-csv-importer.js */
Exhibit.TsvImporter = {};
Exhibit.CsvImporter = {};
Exhibit.TsvCsvImporter = {};
Exhibit.importers["text/comma-separated-values"] = Exhibit.CsvImporter;
Exhibit.importers["text/csv"] = Exhibit.CsvImporter;
Exhibit.importers["text/tab-separated-values"] = Exhibit.TsvImporter;
Exhibit.importers["text/tsv"] = Exhibit.TsvImporter;
Exhibit.TsvImporter.parse = function (content, link, url) {
    return Exhibit.TsvCsvImporter.parse(content, link, url, "\t");
};
Exhibit.CsvImporter.parse = function (content, link, url) {
    return Exhibit.TsvCsvImporter.parse(content, link, url, ",");
};
Exhibit.TsvCsvImporter.parse = function (content, link, url, separator) {
    var url = link;
    var hasColumnTitles = true;
    var expressionString = null;
    if (typeof link != "string") {
        url = link.href;
        expressionString = Exhibit.getAttribute(link, "properties");
        if (expressionString) {
            hasColumnTitles = Exhibit.getAttribute(link, "hasColumnTitles");
            if (hasColumnTitles) {
                hasColumnTitles = (hasColumnTitles.toLowerCase() == "true");
            }
        }
    }
    var valueSeparator = Exhibit.getAttribute(link, "valueSeparator");
    var o = null;
    try {
        o = Exhibit.TsvCsvImporter._parseInternal(content, separator, expressionString, hasColumnTitles, valueSeparator);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Error parsing tsv/csv from " + url);
    }
    return o;
};
Exhibit.TsvCsvImporter._parseInternal = function (text, separator, expressionString, hasColumnTitles, valueSeparator) {
    var data = Exhibit.TsvCsvImporter.CsvToArray(text, separator);
    var exprs = null;
    var propNames = [];
    var properties = [];
    if (hasColumnTitles) {
        exprs = data.shift();
    }
    if (expressionString) {
        exprs = expressionString.split(",");
    }
    if (!exprs) {
        SimileAjax.Debug.exception(new Error("No property names defined for tsv/csv file"));
    }
    for (i = 0;
         i < exprs.length;
         i++) {
        var expr = exprs[i].split(":");
        propNames[i] = expr[0];
        if (expr.length > 1) {
            properties[propNames[i]] = {valueType: expr[1]};
        }
    }
    var items = [];
    for (i = 0;
         i < data.length;
         i++) {
        var row = data[i];
        var item = {};
        var len = row.length < exprs.length ? row.length : exprs.length;
        for (j = 0;
             j < len;
             j++) {
            if (row[j].length > 0) {
                if (valueSeparator && (row[j].indexOf(valueSeparator) >= 0)) {
                    row[j] = row[j].split(valueSeparator);
                }
                item[propNames[j]] = row[j];
            }
        }
        items.push(item);
    }
    return{items: items, properties: properties};
};
Exhibit.TsvCsvImporter.CsvToArray = function (text, separator) {
    var i;
    if (text.indexOf('"') < 0) {
        var lines = text.split(/\r?\n/);
        var items = [];
        for (i = 0;
             i < lines.length;
             i++) {
            if (lines[i].length > 0) {
                items.push(lines[i].split(separator));
            }
        }
        return items;
    }
    text = text.replace(/\r?\n/g, "\n");
    var lines = text.match(/([^"\n]|("[^"]*"))+?(?=\r?\n|$)/g);
    var records = [];
    for (i = 0;
         i < lines.length;
         i++) {
        if (lines[i].length > 0) {
            records.push(lines[i].replace(new RegExp(separator, "g"), "\uFFFF").replace(/"([^"]*"")*[^"]*"/g, function (quoted) {
                return quoted.slice(1, -1).replace(/\uFFFF/g, separator).replace(/""/, '"');
            }).split("\uFFFF"));
        }
    }
    return records;
};


/* xml-importer.js */
Exhibit.XMLImporter = {};
Exhibit.importers["application/xml"] = Exhibit.XMLImporter;
Exhibit.XMLImporter.getItems = function (xmlDoc, configuration) {
    var items = [];

    function maybeAdd(item, property, value) {
        if (item && property && property.length > 0 && value && value.length > 0) {
            if (item[property]) {
                item[property].push(value);
            } else {
                item[property] = [value];
            }
        }
    }

    function visit(node, parentItem, parentProperty) {
        var tag = node.tagName;
        var jQ = SimileAjax.jQuery(node);
        var children = jQ.children();
        var oldParentItem = parentItem;
        if (tag in configuration.itemType) {
            var item = {type: [configuration.itemType[tag]]};
            items.push(item);
            parentItem = item;
        }
        if (children.length == 0) {
            var property = configuration.propertyNames[tag] || tag;
            maybeAdd(parentItem, property, jQ.text().trim());
        } else {
            children.each(function () {
                visit(this, parentItem, tag);
            });
        }
        var attrMap = node.attributes;
        if (attrMap) {
            for (i = 0;
                 i < attrMap.length;
                 i++) {
                var attr = attrMap[i].nodeName;
                maybeAdd(parentItem, configuration.propertyNames[attr] || attr, jQ.attr(attr));
            }
        }
        if (tag in configuration.itemType) {
            if (configuration.labelProperty[tag] != "label") {
                var label = item[configuration.labelProperty[tag]] || [];
                if (label.length > 0) {
                    item.label = label[0];
                }
            }
            parentProperty = configuration.parentRelation[tag] || parentProperty;
            maybeAdd(oldParentItem, parentProperty, item.label);
        }
    }

    visit(xmlDoc, null, null);
    return items;
};
Exhibit.XMLImporter.configure = function (link) {
    var configuration = {"labelProperty": [], "itemType": [], "parentRelation": [], "propertyNames": {}};
    var itemTag = Exhibit.getAttribute(link, "ex:itemTags", ",") || ["item"];
    var labelProperty = Exhibit.getAttribute(link, "ex:labelProperties", ",") || [];
    var itemType = Exhibit.getAttribute(link, "ex:itemTypes", ",") || [];
    var parentRelation = Exhibit.getAttribute(link, "ex:parentRelations", ",") || [];
    for (i = 0;
         i < itemTag.length;
         i++) {
        var tag = itemTag[i];
        configuration.itemType[tag] = itemType[i] || tag;
        configuration.labelProperty[tag] = labelProperty[i] || "label";
        configuration.parentRelation[tag] = parentRelation[i] || tag;
    }
    var propertyNames = Exhibit.getAttribute(link, "ex:propertyNames", ",") || [];
    var propertyTags = Exhibit.getAttribute(link, "ex:propertyTags", ",") || [];
    for (i = 0;
         i < propertyTags.length;
         i++) {
        configuration.propertyNames[propertyTags[i]] = (i < propertyNames.length) ? propertyNames[i] : propertyTags[i];
    }
    return configuration;
};
Exhibit.XMLImporter.parse = function (content, link, url) {
    var self = this;
    var configuration;
    try {
        configuration = Exhibit.XMLImporter.configure(link);
        url = Exhibit.Persistence.resolveURL(url);
    } catch (e) {
        SimileAjax.Debug.exception(e, "Error configuring XML importer for " + url);
        return;
    }
    try {
        var xmlDoc = SimileAjax.jQuery.parseXML(content);
        var o = Exhibit.XMLImporter.getItems(xmlDoc, configuration);
        return{items: o};
    } catch (e) {
        SimileAjax.Debug.exception(e, "Error parsing XML data from " + url);
        return null;
    }
};


/* exhibit.js */
Exhibit.create = function (database) {
    return new Exhibit._Impl(database);
};
Exhibit.getAttribute = function (elmt, name, splitOn) {
    try {
        var value = elmt.getAttribute(name);
        if (value == null || value.length == 0) {
            value = elmt.getAttribute("ex:" + name);
            if (value == null || value.length == 0) {
                value = elmt.getAttribute("data-ex-" + name);
                if (value == null || value.length == 0) {
                    return null;
                }
            }
        }
        if (splitOn == null) {
            return value;
        }
        var values = value.split(splitOn);
        for (var i = 0;
             value = values[i];
             i++) {
            values[i] = value.trim();
        }
        return values;
    } catch (e) {
        return null;
    }
};
Exhibit.getRoleAttribute = function (elmt) {
    var role = Exhibit.getAttribute(elmt, "role") || "";
    role = role.replace(/^exhibit-/, "");
    return role;
};
Exhibit.getConfigurationFromDOM = function (elmt) {
    var c = Exhibit.getAttribute(elmt, "configuration");
    if (c != null && c.length > 0) {
        try {
            var o = eval(c);
            if (typeof o == "object") {
                return o;
            }
        } catch (e) {
        }
    }
    return{};
};
Exhibit.extractOptionsFromElement = function (elmt) {
    var opts = {};
    var attrs = elmt.attributes;
    for (var i in attrs) {
        if (attrs.hasOwnProperty(i)) {
            var name = attrs[i].nodeName;
            var value = attrs[i].nodeValue;
            if (name.indexOf("ex:") == 0) {
                name = name.substring(3);
            }
            opts[name] = value;
        }
    }
    return opts;
};
Exhibit.getExporters = function () {
    Exhibit._initializeExporters();
    return[].concat(Exhibit._exporters);
};
Exhibit.addExporter = function (exporter) {
    Exhibit._initializeExporters();
    Exhibit._exporters.push(exporter);
};
Exhibit._initializeExporters = function () {
    if (!("_exporters" in Exhibit)) {
        Exhibit._exporters = [Exhibit.RdfXmlExporter, Exhibit.SemanticWikitextExporter, Exhibit.TSVExporter, Exhibit.ExhibitJsonExporter, Exhibit.FacetSelectionExporter];
    }
};
Exhibit._Impl = function (database) {
    this._database = database != null ? database : ("database" in window ? window.database : Exhibit.Database.create());
    this._uiContext = Exhibit.UIContext.createRootContext({}, this);
    this._collectionMap = {};
    this._componentMap = {};
    this._historyListener = {onBeforePerform: function (action) {
        if (action.lengthy) {
            Exhibit.UI.showBusyIndicator();
        }
    }, onAfterPerform: function (action) {
        if (action.lengthy) {
            Exhibit.UI.hideBusyIndicator();
        }
    }, onBeforeUndoSeveral: function () {
        Exhibit.UI.showBusyIndicator();
    }, onAfterUndoSeveral: function () {
        Exhibit.UI.hideBusyIndicator();
    }, onBeforeRedoSeveral: function () {
        Exhibit.UI.showBusyIndicator();
    }, onAfterRedoSeveral: function () {
        Exhibit.UI.hideBusyIndicator();
    }};
    SimileAjax.History.addListener(this._historyListener);
};
Exhibit._Impl.prototype.dispose = function () {
    SimileAjax.History.removeListener(this._historyListener);
    for (var id in this._componentMap) {
        try {
            this._componentMap[id].dispose();
        } catch (e) {
            SimileAjax.Debug.exception(e, "Failed to dispose component");
        }
    }
    for (var id in this._collectionMap) {
        try {
            this._collectionMap[id].dispose();
        } catch (e) {
            SimileAjax.Debug.exception(e, "Failed to dispose collection");
        }
    }
    this._uiContext.dispose();
    this._componentMap = null;
    this._collectionMap = null;
    this._uiContext = null;
    this._database = null;
};
Exhibit._Impl.prototype.getDatabase = function () {
    return this._database;
};
Exhibit._Impl.prototype.getUIContext = function () {
    return this._uiContext;
};
Exhibit._Impl.prototype.getCollection = function (id) {
    var collection = this._collectionMap[id];
    if (collection == null && id == "default") {
        collection = Exhibit.Collection.createAllItemsCollection(id, this._database);
        this.setDefaultCollection(collection);
    }
    return collection;
};
Exhibit._Impl.prototype.getDefaultCollection = function () {
    return this.getCollection("default");
};
Exhibit._Impl.prototype.setCollection = function (id, c) {
    if (id in this._collectionMap) {
        try {
            this._collectionMap[id].dispose();
        } catch (e) {
            SimileAjax.Debug.exception(e);
        }
    }
    this._collectionMap[id] = c;
};
Exhibit._Impl.prototype.setDefaultCollection = function (c) {
    this.setCollection("default", c);
};
Exhibit._Impl.prototype.getComponent = function (id) {
    return this._componentMap[id];
};
Exhibit._Impl.prototype.setComponent = function (id, c) {
    if (id in this._componentMap) {
        try {
            this._componentMap[id].dispose();
        } catch (e) {
            SimileAjax.Debug.exception(e);
        }
    }
    this._componentMap[id] = c;
};
Exhibit._Impl.prototype.disposeComponent = function (id) {
    if (id in this._componentMap) {
        try {
            this._componentMap[id].dispose();
        } catch (e) {
            SimileAjax.Debug.exception(e);
        }
        delete this._componentMap[id];
    }
};
Exhibit._Impl.prototype.configure = function (configuration) {
    if ("collections" in configuration) {
        for (var i = 0;
             i < configuration.collections.length;
             i++) {
            var config = configuration.collections[i];
            var id = config.id;
            if (id == null || id.length == 0) {
                id = "default";
            }
            this.setCollection(id, Exhibit.Collection.create2(id, config, this._uiContext));
        }
    }
    if ("components" in configuration) {
        for (var i = 0;
             i < configuration.components.length;
             i++) {
            var config = configuration.components[i];
            var component = Exhibit.UI.create(config, config.elmt, this._uiContext);
            if (component != null) {
                var id = elmt.id;
                if (id == null || id.length == 0) {
                    id = "component" + Math.floor(Math.random() * 1000000);
                }
                this.setComponent(id, component);
            }
        }
    }
};
Exhibit._Impl.prototype.configureFromDOM = function (root) {
    var collectionElmts = [];
    var coderElmts = [];
    var coordinatorElmts = [];
    var lensElmts = [];
    var facetElmts = [];
    var otherElmts = [];
    var f = function (elmt) {
        var role = Exhibit.getRoleAttribute(elmt);
        if (role.length > 0) {
            switch (role) {
                case"collection":
                    collectionElmts.push(elmt);
                    break;
                case"coder":
                    coderElmts.push(elmt);
                    break;
                case"coordinator":
                    coordinatorElmts.push(elmt);
                    break;
                case"lens":
                case"submission-lens":
                case"edit-lens":
                    lensElmts.push(elmt);
                    break;
                case"facet":
                    facetElmts.push(elmt);
                    break;
                default:
                    otherElmts.push(elmt);
            }
        } else {
            var node = elmt.firstChild;
            while (node != null) {
                if (node.nodeType == 1) {
                    f(node);
                }
                node = node.nextSibling;
            }
        }
    };
    f(root || document.body);
    var uiContext = this._uiContext;
    for (var i = 0;
         i < collectionElmts.length;
         i++) {
        var elmt = collectionElmts[i];
        var id = elmt.id;
        if (id == null || id.length == 0) {
            id = "default";
        }
        this.setCollection(id, Exhibit.Collection.createFromDOM2(id, elmt, uiContext));
    }
    var self = this;
    var processElmts = function (elmts) {
        for (var i = 0;
             i < elmts.length;
             i++) {
            var elmt = elmts[i];
            try {
                var component = Exhibit.UI.createFromDOM(elmt, uiContext);
                if (component != null) {
                    var id = elmt.id;
                    if (id == null || id.length == 0) {
                        id = "component" + Math.floor(Math.random() * 1000000);
                    }
                    self.setComponent(id, component);
                }
            } catch (e) {
                SimileAjax.Debug.exception(e);
            }
        }
    };
    processElmts(coordinatorElmts);
    processElmts(coderElmts);
    processElmts(lensElmts);
    processElmts(facetElmts);
    processElmts(otherElmts);
    this.importSettings();
    var exporters = Exhibit.getAttribute(document.body, "exporters");
    if (exporters != null) {
        exporters = exporters.split(";");
        for (var i = 0;
             i < exporters.length;
             i++) {
            var expr = exporters[i];
            var exporter = null;
            try {
                exporter = eval(expr);
            } catch (e) {
            }
            if (exporter == null) {
                try {
                    exporter = eval(expr + "Exporter");
                } catch (e) {
                }
            }
            if (exporter == null) {
                try {
                    exporter = eval("Exhibit." + expr + "Exporter");
                } catch (e) {
                }
            }
            if (typeof exporter == "object") {
                Exhibit.addExporter(exporter);
            }
        }
    }
    var hash = document.location.hash;
    if (hash.length > 1) {
        var itemID = decodeURIComponent(hash.substr(1));
        if (this._database.containsItem(itemID)) {
            this._showFocusDialogOnItem(itemID);
        }
    }
};
Exhibit._Impl.prototype._showFocusDialogOnItem = function (itemID) {
    var dom = SimileAjax.DOM.createDOMFromString("div", "<div class='exhibit-focusDialog-viewContainer' id='lensContainer'></div><div class='exhibit-focusDialog-controls'><button id='closeButton'>" + Exhibit.l10n.focusDialogBoxCloseButtonLabel + "</button></div>");
    dom.elmt.className = "exhibit-focusDialog exhibit-ui-protection";
    dom.close = function () {
        document.body.removeChild(dom.elmt);
    };
    dom.layer = SimileAjax.WindowManager.pushLayer(function () {
        dom.close();
    }, false);
    var itemLens = this._uiContext.getLensRegistry().createLens(itemID, dom.lensContainer, this._uiContext);
    dom.elmt.style.top = (document.body.scrollTop + 100) + "px";
    document.body.appendChild(dom.elmt);
    SimileAjax.WindowManager.registerEvent(dom.closeButton, "click", function (elmt, evt, target) {
        SimileAjax.WindowManager.popLayer(dom.layer);
    }, dom.layer);
};
Exhibit._Impl.prototype.exportSettings = function () {
    var facetSelections = {}, facetSettings = "";
    for (var id in this._componentMap) {
        if (typeof this._componentMap[id].exportFacetSelection !== "undefined") {
            facetSettings = this._componentMap[id].exportFacetSelection() || false;
            if (facetSettings) {
                facetSelections[id] = facetSettings;
            }
        }
    }
    return facetSelections;
};
Exhibit._Impl.prototype.importSettings = function () {
    if (window.location.search.length > 0) {
        searchComponents = window.location.search.substr(1, window.location.search.length - 1).split("&");
        for (var x = 0;
             x < searchComponents.length;
             x++) {
            var component = searchComponents[x].split("=");
            var componentId = component[0];
            var componentSelection = unescape(component[1]);
            if (this._componentMap[componentId] && (typeof this._componentMap[componentId].importFacetSelection !== "undefined")) {
                this._componentMap[componentId].importFacetSelection(componentSelection);
            }
        }
    }
};


/* persistence.js */
Exhibit.Persistence = {};
Exhibit.Persistence.getBaseURL = function (url) {
    try {
        if (url.indexOf("://") < 0) {
            var url2 = Exhibit.Persistence.getBaseURL(document.location.href);
            if (url.substr(0, 1) == "/") {
                url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
            } else {
                url = url2 + url;
            }
        }
        var i = url.lastIndexOf("/");
        if (i < 0) {
            return"";
        } else {
            return url.substr(0, i + 1);
        }
    } catch (e) {
        return url;
    }
};
Exhibit.Persistence.resolveURL = function (url) {
    if (url.indexOf("://") < 0) {
        var url2 = Exhibit.Persistence.getBaseURL(document.location.href);
        if (url.substr(0, 1) == "/") {
            url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
        } else {
            if (url.substr(0, 1) == "#") {
                url2 = document.location.href;
                index = (url2 + "#").indexOf("#");
                url = url2.substr(0, index) + url;
            } else {
                url = url2 + url;
            }
        }
    }
    return url;
};
Exhibit.Persistence.getURLWithoutQueryAndHash = function () {
    var url;
    if ("_urlWithoutQueryAndHash" in Exhibit) {
        url = Exhibit.Persistence._urlWithoutQueryAndHash;
    } else {
        url = document.location.href;
        var hash = url.indexOf("#");
        var question = url.indexOf("?");
        if (question >= 0) {
            url = url.substr(0, question);
        } else {
            if (hash >= 0) {
                url = url.substr(0, hash);
            }
        }
        Exhibit.Persistence._urlWithoutQueryAndHash = url;
    }
    return url;
};
Exhibit.Persistence.getURLWithoutQuery = function () {
    var url;
    if ("_urlWithoutQuery" in Exhibit.Persistence) {
        url = Exhibit.Persistence._urlWithoutQuery;
    } else {
        url = document.location.href;
        var question = url.indexOf("?");
        if (question >= 0) {
            url = url.substr(0, question);
        }
        Exhibit.Persistence._urlWithoutQuery = url;
    }
    return url;
};
Exhibit.Persistence.getItemLink = function (itemID) {
    return Exhibit.Persistence.getURLWithoutQueryAndHash() + "#" + encodeURIComponent(itemID);
};


/* color-coder.js */
Exhibit.ColorCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._map = {};
    this._mixedCase = {label: Exhibit.Coders.l10n.mixedCaseLabel, color: Exhibit.Coders.mixedCaseColor};
    this._missingCase = {label: Exhibit.Coders.l10n.missingCaseLabel, color: Exhibit.Coders.missingCaseColor};
    this._othersCase = {label: Exhibit.Coders.l10n.othersCaseLabel, color: Exhibit.Coders.othersCaseColor};
};
Exhibit.ColorCoder._settingSpecs = {};
Exhibit.ColorCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.ColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.ColorCoder._configure(coder, configuration);
    return coder;
};
Exhibit.ColorCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.ColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ColorCoder._settingSpecs, coder._settings);
    try {
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "color"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ColorCoder: Error processing configuration of coder");
    }
    Exhibit.ColorCoder._configure(coder, configuration);
    return coder;
};
Exhibit.ColorCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ColorCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
    }
};
Exhibit.ColorCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.ColorCoder._colorTable = {"red": "#ff0000", "green": "#00ff00", "blue": "#0000ff", "white": "#ffffff", "black": "#000000", "gray": "#888888"};
Exhibit.ColorCoder.prototype._addEntry = function (kase, key, color) {
    if (color in Exhibit.ColorCoder._colorTable) {
        color = Exhibit.ColorCoder._colorTable[color];
    }
    var entry = null;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"mixed":
            entry = this._mixedCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
    } else {
        this._map[key] = {color: color};
    }
};
Exhibit.ColorCoder.prototype.translate = function (key, flags) {
    if (key in this._map) {
        if (flags) {
            flags.keys.add(key);
        }
        return this._map[key].color;
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.color;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.color;
        }
    }
};
Exhibit.ColorCoder.prototype.translateSet = function (keys, flags) {
    var color = null;
    var self = this;
    keys.visit(function (key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
        } else {
            if (color != color2) {
                if (flags) {
                    flags.mixed = true;
                }
                color = self._mixedCase.color;
                return true;
            }
        }
        return false;
    });
    if (color != null) {
        return color;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.color;
    }
};
Exhibit.ColorCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.ColorCoder.prototype.getOthersColor = function () {
    return this._othersCase.color;
};
Exhibit.ColorCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.ColorCoder.prototype.getMissingColor = function () {
    return this._missingCase.color;
};
Exhibit.ColorCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.ColorCoder.prototype.getMixedColor = function () {
    return this._mixedCase.color;
};


/* color-gradient-coder.js */
Exhibit.ColorGradientCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._gradientPoints = [];
    this._mixedCase = {label: Exhibit.Coders.l10n.mixedCaseLabel, color: Exhibit.Coders.mixedCaseColor};
    this._missingCase = {label: Exhibit.Coders.l10n.missingCaseLabel, color: Exhibit.Coders.missingCaseColor};
    this._othersCase = {label: Exhibit.Coders.l10n.othersCaseLabel, color: Exhibit.Coders.othersCaseColor};
};
Exhibit.ColorGradientCoder._settingSpecs = {};
Exhibit.ColorGradientCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.ColorGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.ColorGradientCoder._configure(coder, configuration);
    return coder;
};
Exhibit.ColorGradientCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.ColorGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ColorGradientCoder._settingSpecs, coder._settings);
    try {
        var gradientPoints = Exhibit.getAttribute(configElmt, "gradientPoints", ";");
        for (var i = 0;
             i < gradientPoints.length;
             i++) {
            var point = gradientPoints[i];
            var value = parseFloat(point);
            var colorIndex = point.indexOf("#") + 1;
            var red = parseInt(point.slice(colorIndex, colorIndex + 2), 16);
            var green = parseInt(point.slice(colorIndex + 2, colorIndex + 4), 16);
            var blue = parseInt(point.slice(colorIndex + 4), 16);
            coder._gradientPoints.push({value: value, red: red, green: green, blue: blue});
        }
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "color"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ColorGradientCoder: Error processing configuration of coder");
    }
    Exhibit.ColorGradientCoder._configure(coder, configuration);
    return coder;
};
Exhibit.ColorGradientCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ColorGradientCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
    }
};
Exhibit.ColorGradientCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.ColorGradientCoder.prototype._addEntry = function (kase, key, color) {
    var entry = null;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"mixed":
            entry = this._mixedCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
    }
};
Exhibit.ColorGradientCoder.prototype.translate = function (key, flags) {
    var gradientPoints = this._gradientPoints;
    var getColor = function (key) {
        for (var j = 0;
             j < gradientPoints.length;
             j++) {
            if (key == gradientPoints[j].value) {
                return rgbToHex(gradientPoints[j].red, gradientPoints[j].green, gradientPoints[j].blue);
            } else {
                if (gradientPoints[j + 1] != null) {
                    if (key < gradientPoints[j + 1].value) {
                        var fraction = (key - gradientPoints[j].value) / (gradientPoints[j + 1].value - gradientPoints[j].value);
                        var newRed = Math.floor(gradientPoints[j].red + fraction * (gradientPoints[j + 1].red - gradientPoints[j].red));
                        var newGreen = Math.floor(gradientPoints[j].green + fraction * (gradientPoints[j + 1].green - gradientPoints[j].green));
                        var newBlue = Math.floor(gradientPoints[j].blue + fraction * (gradientPoints[j + 1].blue - gradientPoints[j].blue));
                        return rgbToHex(newRed, newGreen, newBlue);
                    }
                }
            }
        }
    };
    var rgbToHex = function (r, g, b) {
        var decToHex = function (n) {
            if (n == 0) {
                return"00";
            } else {
                if (n < 16) {
                    return"0" + n.toString(16);
                } else {
                    return n.toString(16);
                }
            }
        };
        return"#" + decToHex(r) + decToHex(g) + decToHex(b);
    };
    if (key.constructor != Number) {
        key = parseFloat(key);
    }
    if (key >= gradientPoints[0].value & key <= gradientPoints[gradientPoints.length - 1].value) {
        if (flags) {
            flags.keys.add(key);
        }
        return getColor(key);
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.color;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.color;
        }
    }
};
Exhibit.ColorGradientCoder.prototype.translateSet = function (keys, flags) {
    var color = null;
    var self = this;
    keys.visit(function (key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
        } else {
            if (color != color2) {
                if (flags) {
                    flags.mixed = true;
                }
                color = self._mixedCase.color;
                return true;
            }
        }
        return false;
    });
    if (color != null) {
        return color;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.color;
    }
};
Exhibit.ColorGradientCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.ColorGradientCoder.prototype.getOthersColor = function () {
    return this._othersCase.color;
};
Exhibit.ColorGradientCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.ColorGradientCoder.prototype.getMissingColor = function () {
    return this._missingCase.color;
};
Exhibit.ColorGradientCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.ColorGradientCoder.prototype.getMixedColor = function () {
    return this._mixedCase.color;
};


/* default-color-coder.js */
Exhibit.DefaultColorCoder = function (uiContext) {
};
Exhibit.DefaultColorCoder.colors = ["#FF9000", "#5D7CBA", "#A97838", "#8B9BBA", "#FFC77F", "#003EBA", "#29447B", "#543C1C"];
Exhibit.DefaultColorCoder._map = {};
Exhibit.DefaultColorCoder._nextColor = 0;
Exhibit.DefaultColorCoder.prototype.translate = function (key, flags) {
    if (key == null) {
        if (flags) {
            flags.missing = true;
        }
        return Exhibit.Coders.missingCaseColor;
    } else {
        if (flags) {
            flags.keys.add(key);
        }
        if (key in Exhibit.DefaultColorCoder._map) {
            return Exhibit.DefaultColorCoder._map[key];
        } else {
            var color = Exhibit.DefaultColorCoder.colors[Exhibit.DefaultColorCoder._nextColor];
            Exhibit.DefaultColorCoder._nextColor = (Exhibit.DefaultColorCoder._nextColor + 1) % Exhibit.DefaultColorCoder.colors.length;
            Exhibit.DefaultColorCoder._map[key] = color;
            return color;
        }
    }
};
Exhibit.DefaultColorCoder.prototype.translateSet = function (keys, flags) {
    var color = null;
    var self = this;
    keys.visit(function (key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
        } else {
            if (color != color2) {
                color = Exhibit.Coders.mixedCaseColor;
                flags.mixed = true;
                return true;
            }
        }
        return false;
    });
    if (color != null) {
        return color;
    } else {
        flags.missing = true;
        return Exhibit.Coders.missingCaseColor;
    }
};
Exhibit.DefaultColorCoder.prototype.getOthersLabel = function () {
    return Exhibit.Coders.l10n.othersCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getOthersColor = function () {
    return Exhibit.Coders.othersCaseColor;
};
Exhibit.DefaultColorCoder.prototype.getMissingLabel = function () {
    return Exhibit.Coders.l10n.missingCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getMissingColor = function () {
    return Exhibit.Coders.missingCaseColor;
};
Exhibit.DefaultColorCoder.prototype.getMixedLabel = function () {
    return Exhibit.Coders.l10n.mixedCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getMixedColor = function () {
    return Exhibit.Coders.mixedCaseColor;
};


/* icon-coder.js */
Exhibit.IconCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._map = {};
    this._mixedCase = {label: "mixed", icon: null};
    this._missingCase = {label: "missing", icon: null};
    this._othersCase = {label: "others", icon: null};
};
Exhibit.IconCoder._settingSpecs = {};
Exhibit.IconCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.IconCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.IconCoder._configure(coder, configuration);
    return coder;
};
Exhibit.IconCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.IconCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.IconCoder._settingSpecs, coder._settings);
    try {
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "icon"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "IconCoder: Error processing configuration of coder");
    }
    Exhibit.IconCoder._configure(coder, configuration);
    return coder;
};
Exhibit.IconCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.IconCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].icon);
        }
    }
};
Exhibit.IconCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.IconCoder._iconTable = {};
Exhibit.IconCoder.prototype._addEntry = function (kase, key, icon) {
    if (icon in Exhibit.IconCoder._iconTable) {
        icon = Exhibit.IconCoder._iconTable[icon];
    }
    var entry = null;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"mixed":
            entry = this._mixedCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.icon = icon;
    } else {
        this._map[key] = {icon: icon};
    }
};
Exhibit.IconCoder.prototype.translate = function (key, flags) {
    if (key in this._map) {
        if (flags) {
            flags.keys.add(key);
        }
        return this._map[key].icon;
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.icon;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.icon;
        }
    }
};
Exhibit.IconCoder.prototype.translateSet = function (keys, flags) {
    var icon = null;
    var self = this;
    keys.visit(function (key) {
        var icon2 = self.translate(key, flags);
        if (icon == null) {
            icon = icon2;
        } else {
            if (icon != icon2) {
                if (flags) {
                    flags.mixed = true;
                }
                icon = self._mixedCase.icon;
                return true;
            }
        }
        return false;
    });
    if (icon != null) {
        return icon;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.icon;
    }
};
Exhibit.IconCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.IconCoder.prototype.getOthersIcon = function () {
    return this._othersCase.icon;
};
Exhibit.IconCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.IconCoder.prototype.getMissingIcon = function () {
    return this._missingCase.icon;
};
Exhibit.IconCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.IconCoder.prototype.getMixedIcon = function () {
    return this._mixedCase.icon;
};


/* ordered-color-coder.js */
Exhibit.OrderedColorCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._map = {};
    this._order = new Exhibit.OrderedColorCoder._OrderedHash();
    this._usePriority = "highest";
    this._mixedCase = {label: null, color: null, isDefault: true};
    this._missingCase = {label: Exhibit.Coders.l10n.missingCaseLabel, color: Exhibit.Coders.missingCaseColor, isDefault: true};
    this._othersCase = {label: Exhibit.Coders.l10n.othersCaseLabel, color: Exhibit.Coders.othersCaseColor, isDefault: true};
};
Exhibit.OrderedColorCoder._OrderedHash = function () {
    this.size = 0;
    this.hash = {};
};
Exhibit.OrderedColorCoder._OrderedHash.prototype.add = function (key) {
    this.hash[key] = this.size++;
};
Exhibit.OrderedColorCoder._OrderedHash.prototype.size = function () {
    return this.size;
};
Exhibit.OrderedColorCoder._OrderedHash.prototype.get = function (key) {
    return this.hash[key];
};
Exhibit.OrderedColorCoder._settingSpecs = {};
Exhibit.OrderedColorCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.OrderedColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.OrderedColorCoder._configure(coder, configuration);
    return coder;
};
Exhibit.OrderedColorCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.OrderedColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.OrderedColorCoder._settingSpecs, coder._settings);
    try {
        this._usePriority = coder._settings.usePriority;
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "color"));
            }
            node = node.nextSibling;
        }
        if (coder.getOthersIsDefault()) {
            coder._addEntry("other", coder.getOthersLabel(), coder.getOthersColor());
        }
        if (coder.getMissingIsDefault()) {
            coder._addEntry("missing", coder.getMissingLabel(), coder.getMissingColor());
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "OrderedColorCoder: Error processing configuration of coder");
    }
    Exhibit.OrderedColorCoder._configure(coder, configuration);
    return coder;
};
Exhibit.OrderedColorCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.OrderedColorCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
        if (this.getOthersIsDefault()) {
            coder._addEntry("other", this.getOthersLabel(), this.getOthersColor());
        }
        if (this.getMissingIsDefault()) {
            coder._addEntry("missing", this.getMissingLabel(), this.getMissingColor());
        }
    }
};
Exhibit.OrderedColorCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.OrderedColorCoder._colorTable = {"red": "#ff0000", "green": "#00ff00", "blue": "#0000ff", "white": "#ffffff", "black": "#000000", "gray": "#888888"};
Exhibit.OrderedColorCoder.prototype._addEntry = function (kase, key, color) {
    if (color in Exhibit.OrderedColorCoder._colorTable) {
        color = Exhibit.OrderedColorCoder._colorTable[color];
    }
    var entry = null;
    var mixed = false;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
        case"mixed":
            mixed = true;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
        entry.isDefault = false;
        this._order.add(key);
    } else {
        if (!mixed) {
            this._map[key] = {color: color};
            this._order.add(key);
        }
    }
};
Exhibit.OrderedColorCoder.prototype.translate = function (key, flags) {
    if (key in this._map) {
        if (flags) {
            flags.keys.add(key);
        }
        return this._map[key].color;
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.color;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.color;
        }
    }
};
Exhibit.OrderedColorCoder.prototype.translateSet = function (keys, flags) {
    var color = null;
    var lastKey = null;
    var self = this;
    keys.visit(function (key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
            lastKey = key;
        } else {
            if (color != color2) {
                if (key == null) {
                    key = self.getMissingLabel();
                } else {
                    if (!(key in self._map)) {
                        key = self.getOthersLabel();
                    }
                }
                var keyOrder = self._order.get(key);
                var lastKeyOrder = self._order.get(lastKey);
                if (self._usePriority == "highest") {
                    if (keyOrder < lastKeyOrder) {
                        color = color2;
                        lastKey = key;
                    }
                } else {
                    if (self._usePriority == "lowest") {
                        if (keyOrder > lastKeyOrder) {
                            color = color2;
                            lastKey = key;
                        }
                    } else {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    });
    if (color != null) {
        return color;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.color;
    }
};
Exhibit.OrderedColorCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.OrderedColorCoder.prototype.getOthersColor = function () {
    return this._othersCase.color;
};
Exhibit.OrderedColorCoder.prototype.getOthersIsDefault = function () {
    return this._othersCase.isDefault;
};
Exhibit.OrderedColorCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.OrderedColorCoder.prototype.getMissingColor = function () {
    return this._missingCase.color;
};
Exhibit.OrderedColorCoder.prototype.getMissingIsDefault = function () {
    return this._missingCase.isDefault;
};
Exhibit.OrderedColorCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.OrderedColorCoder.prototype.getMixedColor = function () {
    return this._mixedCase.color;
};
Exhibit.OrderedColorCoder.prototype.getMixedIsDefault = function () {
    return this._mixedCase.isDefault;
};


/* size-coder.js */
Exhibit.SizeCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._map = {};
    this._mixedCase = {label: "mixed", size: 10};
    this._missingCase = {label: "missing", size: 10};
    this._othersCase = {label: "others", size: 10};
};
Exhibit.SizeCoder._settingSpecs = {};
Exhibit.SizeCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.SizeCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SizeCoder._configure(coder, configuration);
    return coder;
};
Exhibit.SizeCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.SizeCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.SizeCoder._settingSpecs, coder._settings);
    try {
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "size"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "SizeCoder: Error processing configuration of coder");
    }
    Exhibit.SizeCoder._configure(coder, configuration);
    return coder;
};
Exhibit.SizeCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.SizeCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].size);
        }
    }
};
Exhibit.SizeCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.SizeCoder.prototype._addEntry = function (kase, key, size) {
    var entry = null;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"mixed":
            entry = this._mixedCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.size = size;
    } else {
        this._map[key] = {size: size};
    }
};
Exhibit.SizeCoder.prototype.translate = function (key, flags) {
    if (key in this._map) {
        if (flags) {
            flags.keys.add(key);
        }
        return this._map[key].size;
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.size;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.size;
        }
    }
};
Exhibit.SizeCoder.prototype.translateSet = function (keys, flags) {
    var size = null;
    var self = this;
    keys.visit(function (key) {
        var size2 = self.translate(key, flags);
        if (size == null) {
            size = size2;
        } else {
            if (size != size2) {
                if (flags) {
                    flags.mixed = true;
                }
                size = self._mixedCase.size;
                return true;
            }
        }
        return false;
    });
    if (size != null) {
        return size;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.size;
    }
};
Exhibit.SizeCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.SizeCoder.prototype.getOthersSize = function () {
    return this._othersCase.size;
};
Exhibit.SizeCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.SizeCoder.prototype.getMissingSize = function () {
    return this._missingCase.size;
};
Exhibit.SizeCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.SizeCoder.prototype.getMixedSize = function () {
    return this._mixedCase.size;
};


/* size-gradient-coder.js */
Exhibit.SizeGradientCoder = function (uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    this._log = {func: function (size) {
        return Math.ceil(Math.log(size));
    }, invFunc: function (size) {
        return Math.ceil(Math.exp(size));
    }};
    this._linear = {func: function (size) {
        return Math.ceil(size);
    }, invFunc: function (size) {
        return Math.ceil(size);
    }};
    this._quad = {func: function (size) {
        return Math.ceil(Math.pow((size / 100), 2));
    }, invFunc: function (size) {
        return Math.sqrt(size) * 100;
    }};
    this._exp = {func: function (size) {
        return Math.ceil(Math.exp(size));
    }, invFunc: function (size) {
        return Math.ceil(Math.log(size));
    }};
    this._markerScale = this._quad;
    this._valueScale = this._linear;
    this._gradientPoints = [];
    this._mixedCase = {label: "mixed", size: 20};
    this._missingCase = {label: "missing", size: 20};
    this._othersCase = {label: "others", size: 20};
};
Exhibit.SizeGradientCoder._settingSpecs = {};
Exhibit.SizeGradientCoder.create = function (configuration, uiContext) {
    var coder = new Exhibit.SizeGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SizeGradientCoder._configure(coder, configuration);
    return coder;
};
Exhibit.SizeGradientCoder.createFromDOM = function (configElmt, uiContext) {
    configElmt.style.display = "none";
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.SizeGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.SizeGradientCoder._settingSpecs, coder._settings);
    try {
        var markerScale = coder._settings.markerScale;
        if (markerScale == "log") {
            coder._markerScale = coder._log;
        }
        if (markerScale == "linear") {
            coder._markerScale = coder._linear;
        }
        if (markerScale == "exp") {
            coder._markerScale = coder._exp;
        }
        var gradientPoints = Exhibit.getAttribute(configElmt, "gradientPoints", ";");
        for (var i = 0;
             i < gradientPoints.length;
             i++) {
            var point = gradientPoints[i].split(",");
            var value = parseFloat(point[0]);
            var size = coder._markerScale.invFunc(parseFloat(point[1]));
            coder._gradientPoints.push({value: value, size: size});
        }
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(Exhibit.getAttribute(node, "case"), node.firstChild.nodeValue.trim(), Exhibit.getAttribute(node, "size"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "SizeGradientCoder: Error processing configuration of coder");
    }
    Exhibit.SizeGradientCoder._configure(coder, configuration);
    return coder;
};
Exhibit.SizeGradientCoder._configure = function (coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.SizeGradientCoder._settingSpecs, coder._settings);
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0;
             i < entries.length;
             i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].size);
        }
    }
};
Exhibit.SizeGradientCoder.prototype.dispose = function () {
    this._uiContext = null;
    this._settings = null;
};
Exhibit.SizeGradientCoder.prototype._addEntry = function (kase, key, size) {
    var entry = null;
    switch (kase) {
        case"others":
            entry = this._othersCase;
            break;
        case"mixed":
            entry = this._mixedCase;
            break;
        case"missing":
            entry = this._missingCase;
            break;
    }
    if (entry != null) {
        entry.label = key;
        entry.size = size;
    }
};
Exhibit.SizeGradientCoder.prototype.translate = function (key, flags) {
    var self = this;
    var gradientPoints = this._gradientPoints;
    var getSize = function (key) {
        if (key.constructor != Number) {
            key = parseFloat(key);
        }
        for (j = 0;
             j < gradientPoints.length;
             j++) {
            if (key == gradientPoints[j].value) {
                return self._markerScale.func(gradientPoints[j].size);
            } else {
                if (gradientPoints[j + 1] != null) {
                    if (key < gradientPoints[j + 1].value) {
                        var fraction = (key - gradientPoints[j].value) / (gradientPoints[j + 1].value - gradientPoints[j].value);
                        var newSize = Math.floor(gradientPoints[j].size + fraction * (gradientPoints[j + 1].size - gradientPoints[j].size));
                        return self._markerScale.func(newSize);
                    }
                }
            }
        }
    };
    if (key >= gradientPoints[0].value & key <= gradientPoints[gradientPoints.length - 1].value) {
        if (flags) {
            flags.keys.add(key);
        }
        return getSize(key);
    } else {
        if (key == null) {
            if (flags) {
                flags.missing = true;
            }
            return this._missingCase.size;
        } else {
            if (flags) {
                flags.others = true;
            }
            return this._othersCase.size;
        }
    }
};
Exhibit.SizeGradientCoder.prototype.translateSet = function (keys, flags) {
    var size = null;
    var self = this;
    keys.visit(function (key) {
        var size2 = self.translate(key, flags);
        if (size == null) {
            size = size2;
        } else {
            if (size != size2) {
                if (flags) {
                    flags.mixed = true;
                }
                size = self._mixedCase.size;
                return true;
            }
        }
        return false;
    });
    if (size != null) {
        return size;
    } else {
        if (flags) {
            flags.missing = true;
        }
        return this._missingCase.size;
    }
};
Exhibit.SizeGradientCoder.prototype.getOthersLabel = function () {
    return this._othersCase.label;
};
Exhibit.SizeGradientCoder.prototype.getOthersSize = function () {
    return this._othersCase.size;
};
Exhibit.SizeGradientCoder.prototype.getMissingLabel = function () {
    return this._missingCase.label;
};
Exhibit.SizeGradientCoder.prototype.getMissingSize = function () {
    return this._missingCase.size;
};
Exhibit.SizeGradientCoder.prototype.getMixedLabel = function () {
    return this._mixedCase.label;
};
Exhibit.SizeGradientCoder.prototype.getMixedSize = function () {
    return this._mixedCase.size;
};


/* coordinator.js */
Exhibit.Coordinator = function (uiContext) {
    this._uiContext = uiContext;
    this._listeners = [];
};
Exhibit.Coordinator.create = function (configuration, uiContext) {
    var coordinator = new Exhibit.Coordinator(uiContext);
    return coordinator;
};
Exhibit.Coordinator.createFromDOM = function (div, uiContext) {
    var coordinator = new Exhibit.Coordinator(Exhibit.UIContext.createFromDOM(div, uiContext, false));
    return coordinator;
};
Exhibit.Coordinator.prototype.dispose = function () {
    this._uiContext.dispose();
    this._uiContext = null;
};
Exhibit.Coordinator.prototype.addListener = function (callback) {
    var listener = new Exhibit.Coordinator._Listener(this, callback);
    this._listeners.push(listener);
    return listener;
};
Exhibit.Coordinator.prototype._removeListener = function (listener) {
    for (var i = 0;
         i < this._listeners.length;
         i++) {
        if (this._listeners[i] == listener) {
            this._listeners.splice(i, 1);
            return;
        }
    }
};
Exhibit.Coordinator.prototype._fire = function (listener, o) {
    for (var i = 0;
         i < this._listeners.length;
         i++) {
        var listener2 = this._listeners[i];
        if (listener2 != listener) {
            listener2._callback(o);
        }
    }
};
Exhibit.Coordinator._Listener = function (coordinator, callback) {
    this._coordinator = coordinator;
    this._callback = callback;
};
Exhibit.Coordinator._Listener.prototype.dispose = function () {
    this._coordinator._removeListener(this);
};
Exhibit.Coordinator._Listener.prototype.fire = function (o) {
    this._coordinator._fire(this, o);
};


/* alpha-range-facet.js */
Exhibit.AlphaRangeFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._expression = null;
    this._settings = {};
    this._dom = null;
    this._ranges = [];
    var self = this;
    this._listener = {onRootItemsChanged: function () {
        if ("_rangeIndex" in self) {
            delete self._rangeIndex;
        }
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.AlphaRangeFacet._settingSpecs = {"facetLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "interval": {type: "int", defaultValue: 7}, "collapsible": {type: "boolean", defaultValue: false}, "collapsed": {type: "boolean", defaultValue: false}};
Exhibit.AlphaRangeFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.AlphaRangeFacet(containerElmt, uiContext);
    Exhibit.AlphaRangeFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.AlphaRangeFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.AlphaRangeFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.AlphaRangeFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "AlphaRangeFacet: Error processing configuration of alpha range facet");
    }
    Exhibit.AlphaRangeFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.AlphaRangeFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.AlphaRangeFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
};
Exhibit.AlphaRangeFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._settings = null;
    this._ranges = [];
};
Exhibit.AlphaRangeFacet.prototype.hasRestrictions = function () {
    return this._ranges.length > 0;
};
Exhibit.AlphaRangeFacet.prototype.clearAllRestrictions = function () {
    var restrictions = [];
    if (this._ranges.length > 0) {
        restrictions = restrictions.concat(this._ranges);
        this._ranges = [];
        this._notifyCollection();
    }
    return restrictions;
};
Exhibit.AlphaRangeFacet.prototype.applyRestrictions = function (restrictions) {
    this._ranges = restrictions;
    this._notifyCollection();
};
Exhibit.AlphaRangeFacet.prototype.setRange = function (from, to, selected) {
    if (selected) {
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                return;
            }
        }
        this._ranges.push({from: from, to: to});
    } else {
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                this._ranges.splice(i, 1);
                break;
            }
        }
    }
    this._notifyCollection();
};
Exhibit.AlphaRangeFacet.prototype.restrict = function (items) {
    if (this._ranges.length == 0) {
        return items;
    } else {
        this._buildRangeIndex();
        var set = new Exhibit.Set();
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range = this._ranges[i];
            this._rangeIndex.getSubjectsInRange(range.from, String.fromCharCode(range.to.charCodeAt(0) + 1), true, set, items);
        }
        return set;
    }
};
Exhibit.AlphaRangeFacet.prototype.update = function (items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._reconstruct(items);
    this._dom.valuesContainer.style.display = "block";
};
Exhibit.AlphaRangeFacet.prototype._reconstruct = function (items) {
    var self = this;
    var ranges = [];
    var rangeIndex;
    var computeItems;
    this._buildRangeIndex();
    rangeIndex = this._rangeIndex;
    countItems = function (range) {
        return rangeIndex.getSubjectsInRange(range.from, String.fromCharCode(range.to.charCodeAt(0) + 1), true, null, items).size();
    };
    var alphaList = [];
    var alphaInList = function (a) {
        for (x in alphaList) {
            if (alphaList[x] == a) {
                return true;
            }
        }
        return false;
    };
    for (var y = 0;
         y < rangeIndex.getCount();
         y += 1) {
        var alphaChar = rangeIndex._pairs[y].value.substr(0, 1).toUpperCase();
        if (!alphaInList(alphaChar)) {
            alphaList.push(alphaChar);
        }
    }
    for (var x = 0;
         x < alphaList.length;
         x += this._settings.interval) {
        var range = {from: alphaList[x], to: alphaList[(x + this._settings.interval >= alphaList.length ? alphaList.length - 1 : x + this._settings.interval - 1)], selected: false};
        range.count = countItems(range);
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range2 = this._ranges[i];
            if (range2.from == range.from && range2.to == range.to) {
                range.selected = true;
                facetHasSelection = true;
                break;
            }
        }
        ranges.push(range);
    }
    var facetHasSelection = this._ranges.length > 0;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetItem" : "constructFlowingFacetItem"];
    var makeFacetValue = function (from, to, count, selected) {
        var onSelect = function (elmt, evt, target) {
            self._toggleRange(from, to, selected, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function (elmt, evt, target) {
            self._toggleRange(from, to, selected, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = constructFacetItemFunction(from.substr(0, 1) + " - " + to.substr(0, 1), count, null, selected, facetHasSelection, onSelect, onSelectOnly, self._uiContext);
        containerDiv.appendChild(elmt);
    };
    for (var i = 0;
         i < ranges.length;
         i++) {
        var range = ranges[i];
        if (range.selected || range.count > 0) {
            makeFacetValue(range.from, range.to, range.count, range.selected);
        }
    }
    containerDiv.style.display = "block";
    this._dom.setSelectionCount(this._ranges.length);
};
Exhibit.AlphaRangeFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.AlphaRangeFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](this, this._div, this._settings.facetLabel, function (elmt, evt, target) {
        self._clearSelections();
    }, this._uiContext, this._settings.collapsible, this._settings.collapsed);
    if ("height" in this._settings) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};
Exhibit.AlphaRangeFacet.prototype._toggleRange = function (from, to, wasSelected, singleSelection) {
    var self = this;
    var label = from + " to " + to;
    var wasOnlyThingSelected = (this._ranges.length == 1 && wasSelected);
    if (singleSelection && !wasOnlyThingSelected) {
        var newRestrictions = [
            {from: from, to: to}
        ];
        var oldRestrictions = [].concat(this._ranges);
        SimileAjax.History.addLengthyAction(function () {
            self.applyRestrictions(newRestrictions);
        }, function () {
            self.applyRestrictions(oldRestrictions);
        }, String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, this._settings.facetLabel]));
    } else {
        SimileAjax.History.addLengthyAction(function () {
            self.setRange(from, to, !wasSelected);
        }, function () {
            self.setRange(from, to, wasSelected);
        }, String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, this._settings.facetLabel]));
    }
};
Exhibit.AlphaRangeFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.AlphaRangeFacet.prototype._buildRangeIndex = function () {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        var segment = expression.getPath().getLastSegment();
        var property = database.getProperty(segment.property);
        var getter = function (item, f) {
            database.getObjects(item, property.getID(), null, null).visit(function (value) {
                f(value.toUpperCase());
            });
        };
        this._rangeIndex = new Exhibit.Database._RangeIndex(this._uiContext.getCollection().getAllItems(), getter);
    }
};
Exhibit.AlphaRangeFacet.prototype.exportFacetSelection = function () {
    var exportedSettings = [];
    for (var i = 0;
         i < this._ranges.length;
         i++) {
        var range = this._ranges[i];
        exportedSettings.push(range.from + "|" + range.to);
    }
    return exportedSettings.join(",");
};
Exhibit.AlphaRangeFacet.prototype.importFacetSelection = function (settings) {
    if (settings.length > 0) {
        var ranges = settings.split(",");
        for (var i = 0;
             i < ranges.length;
             i++) {
            var range = ranges[i].split("|");
            this._ranges.push({from: range[0], to: range[1]});
        }
    }
    if (ranges && ranges.length > 0) {
        this.update();
        this._notifyCollection();
    }
};


/* cloud-facet.js */
Exhibit.CloudFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    this._expression = null;
    this._valueSet = new Exhibit.Set();
    this._selectMissing = false;
    this._settings = {};
    this._dom = null;
    var self = this;
    this._listener = {onRootItemsChanged: function () {
        if ("_itemToValue" in self) {
            delete self._itemToValue;
        }
        if ("_valueToItem" in self) {
            delete self._valueToItem;
        }
        if ("_missingItems" in self) {
            delete self._missingItems;
        }
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.CloudFacet._settingSpecs = {"facetLabel": {type: "text"}, "minimumCount": {type: "int", defaultValue: 1}, "showMissing": {type: "boolean", defaultValue: true}, "missingLabel": {type: "text"}};
Exhibit.CloudFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.CloudFacet(containerElmt, uiContext);
    Exhibit.CloudFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.CloudFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.CloudFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.CloudFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s;
                 s = selection[i];
                 i++) {
                facet._valueSet.add(s);
            }
        }
        var selectMissing = Exhibit.getAttribute(configElmt, "selectMissing");
        if (selectMissing != null && selectMissing.length > 0) {
            facet._selectMissing = (selectMissing == "true");
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "CloudFacet: Error processing configuration of cloud facet");
    }
    Exhibit.CloudFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.CloudFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.CloudFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0;
             i < selection.length;
             i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("selectMissing" in configuration) {
        facet._selectMissing = configuration.selectMissing;
    }
};
Exhibit.CloudFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._valueSet = null;
    this._settings = null;
    this._itemToValue = null;
    this._valueToItem = null;
    this._missingItems = null;
};
Exhibit.CloudFacet.prototype.hasRestrictions = function () {
    return this._valueSet.size() > 0 || this._selectMissing;
};
Exhibit.CloudFacet.prototype.clearAllRestrictions = function () {
    var restrictions = {selection: [], selectMissing: false};
    if (this.hasRestrictions()) {
        this._valueSet.visit(function (v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
        SimileAjax.RemoteLog.possiblyLog({facetType: "Cloud", facetLabel: this._settings.facetLabel, operation: "clearAllRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
    }
    return restrictions;
};
Exhibit.CloudFacet.prototype.applyRestrictions = function (restrictions) {
    this._valueSet = new Exhibit.Set();
    for (var i = 0;
         i < restrictions.selection.length;
         i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "Cloud", facetLabel: this._settings.facetLabel, operation: "applyRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
};
Exhibit.CloudFacet.prototype.setSelection = function (value, selected) {
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "Cloud", facetLabel: this._settings.facetLabel, operation: "setSelection", value: value, selected: selected, exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
};
Exhibit.CloudFacet.prototype.setSelectMissing = function (selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
};
Exhibit.CloudFacet.prototype.restrict = function (items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    var set;
    if (this._expression.isPath()) {
        set = this._expression.getPath().walkBackward(this._valueSet, "item", items, this._uiContext.getDatabase()).getSet();
    } else {
        this._buildMaps();
        set = new Exhibit.Set();
        var valueToItem = this._valueToItem;
        this._valueSet.visit(function (value) {
            if (value in valueToItem) {
                var itemA = valueToItem[value];
                for (var i = 0;
                     i < itemA.length;
                     i++) {
                    var item = itemA[i];
                    if (items.contains(item)) {
                        set.add(item);
                    }
                }
            }
        });
    }
    if (this._selectMissing) {
        this._buildMaps();
        var missingItems = this._missingItems;
        items.visit(function (item) {
            if (item in missingItems) {
                set.add(item);
            }
        });
    }
    return set;
};
Exhibit.CloudFacet.prototype.update = function (items) {
    this._constructBody(this._computeFacet(items));
};
Exhibit.CloudFacet.prototype._computeFacet = function (items) {
    var database = this._uiContext.getDatabase();
    var entries = [];
    var valueType = "text";
    var self = this;
    if (this._expression.isPath()) {
        var path = this._expression.getPath();
        var facetValueResult = path.walkForward(items, "item", database);
        valueType = facetValueResult.valueType;
        if (facetValueResult.size > 0) {
            facetValueResult.forEachValue(function (facetValue) {
                var itemSubcollection = path.evaluateBackward(facetValue, valueType, items, database);
                if (itemSubcollection.size >= self._settings.minimumCount || self._valueSet.contains(facetValue)) {
                    entries.push({value: facetValue, count: itemSubcollection.size});
                }
            });
        }
    } else {
        this._buildMaps();
        valueType = this._valueType;
        for (var value in this._valueToItem) {
            var itemA = this._valueToItem[value];
            var count = 0;
            for (var i = 0;
                 i < itemA.length;
                 i++) {
                if (items.contains(itemA[i])) {
                    count++;
                }
            }
            if (count >= this._settings.minimumCount || this._valueSet.contains(value)) {
                entries.push({value: value, count: count});
            }
        }
    }
    if (entries.length > 0) {
        var selection = this._valueSet;
        var labeler = valueType == "item" ? function (v) {
            var l = database.getObject(v, "label");
            return l != null ? l : v;
        } : function (v) {
            return v;
        };
        for (var i = 0;
             i < entries.length;
             i++) {
            var entry = entries[i];
            entry.actionLabel = entry.selectionLabel = labeler(entry.value);
            entry.selected = selection.contains(entry.value);
        }
        var sortValueFunction = function (a, b) {
            return a.selectionLabel.localeCompare(b.selectionLabel);
        };
        if ("_orderMap" in this) {
            var orderMap = this._orderMap;
            sortValueFunction = function (a, b) {
                if (a.selectionLabel in orderMap) {
                    if (b.selectionLabel in orderMap) {
                        return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                    } else {
                        return -1;
                    }
                } else {
                    if (b.selectionLabel in orderMap) {
                        return 1;
                    } else {
                        return a.selectionLabel.localeCompare(b.selectionLabel);
                    }
                }
            };
        } else {
            if (valueType == "number") {
                sortValueFunction = function (a, b) {
                    a = parseFloat(a.value);
                    b = parseFloat(b.value);
                    return a < b ? -1 : a > b ? 1 : 0;
                };
            }
        }
        var sortFunction = sortValueFunction;
        if (this._settings.sortMode == "count") {
            sortFunction = function (a, b) {
                var c = b.count - a.count;
                return c != 0 ? c : sortValueFunction(a, b);
            };
        }
        var sortDirectionFunction = sortFunction;
        if (this._settings.sortDirection == "reverse") {
            sortDirectionFunction = function (a, b) {
                return sortFunction(b, a);
            };
        }
        entries.sort(sortDirectionFunction);
    }
    if (this._settings.showMissing || this._selectMissing) {
        this._buildMaps();
        var count = 0;
        for (var item in this._missingItems) {
            if (items.contains(item)) {
                count++;
            }
        }
        if (count > 0 || this._selectMissing) {
            var span = document.createElement("span");
            span.innerHTML = ("missingLabel" in this._settings) ? this._settings.missingLabel : Exhibit.FacetUtilities.l10n.missingThisField;
            span.className = "exhibit-facet-value-missingThisField";
            entries.unshift({value: null, count: count, selected: this._selectMissing, selectionLabel: span, actionLabel: Exhibit.FacetUtilities.l10n.missingThisField});
        }
    }
    return entries;
};
Exhibit.CloudFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.CloudFacet.prototype._initializeUI = function () {
    this._div.innerHTML = "";
    this._div.className = "exhibit-cloudFacet";
    var dom = SimileAjax.DOM.createDOMFromString(this._div, (("facetLabel" in this._settings) ? ("<div class='exhibit-cloudFacet-header'><span class='exhibit-cloudFacet-header-title'>" + this._settings.facetLabel + "</span></div>") : "") + "<div class='exhibit-cloudFacet-body' id='valuesContainer'></div>");
    this._dom = dom;
};
Exhibit.CloudFacet.prototype._constructBody = function (entries) {
    var self = this;
    var div = this._dom.valuesContainer;
    div.style.display = "none";
    div.innerHTML = "";
    if (entries.length > 0) {
        var min = Number.POSITIVE_INFINITY;
        var max = Number.NEGATIVE_INFINITY;
        for (var j = 0;
             j < entries.length;
             j++) {
            var entry = entries[j];
            min = Math.min(min, entry.count);
            max = Math.max(max, entry.count);
        }
        var range = max - min;
        var constructValue = function (entry) {
            var onSelect = function (elmt, evt, target) {
                self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            };
            var elmt = document.createElement("span");
            elmt.appendChild(document.createTextNode("\u00A0"));
            if (typeof entry.selectionLabel == "string") {
                elmt.appendChild(document.createTextNode(entry.selectionLabel));
            } else {
                elmt.appendChild(entry.selectionLabel);
            }
            elmt.appendChild(document.createTextNode("\u00A0"));
            elmt.className = entry.selected ? "exhibit-cloudFacet-value exhibit-cloudFacet-value-selected" : "exhibit-cloudFacet-value";
            if (entry.count > min) {
                elmt.style.fontSize = Math.ceil(100 + 100 * Math.log(1 + 1.5 * (entry.count - min) / range)) + "%";
            }
            SimileAjax.WindowManager.registerEvent(elmt, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
            div.appendChild(elmt);
            div.appendChild(document.createTextNode(" "));
        };
        for (var j = 0;
             j < entries.length;
             j++) {
            constructValue(entries[j]);
        }
    }
    div.style.display = "block";
};
Exhibit.CloudFacet.prototype._filter = function (value, label, selectOnly) {
    var self = this;
    var selected, select, deselect;
    var oldValues = new Exhibit.Set(this._valueSet);
    var oldSelectMissing = this._selectMissing;
    var newValues;
    var newSelectMissing;
    var actionLabel;
    var wasSelected;
    var wasOnlyThingSelected;
    if (value == null) {
        wasSelected = oldSelectMissing;
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 0);
        if (selectOnly) {
            if (oldValues.size() == 0) {
                newSelectMissing = !oldSelectMissing;
            } else {
                newSelectMissing = true;
            }
            newValues = new Exhibit.Set();
        } else {
            newSelectMissing = !oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
        }
    } else {
        wasSelected = oldValues.contains(value);
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 1) && !oldSelectMissing;
        if (selectOnly) {
            newSelectMissing = false;
            newValues = new Exhibit.Set();
            if (!oldValues.contains(value)) {
                newValues.add(value);
            } else {
                if (oldValues.size() > 1 || oldSelectMissing) {
                    newValues.add(value);
                }
            }
        } else {
            newSelectMissing = oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
            if (newValues.contains(value)) {
                newValues.remove(value);
            } else {
                newValues.add(value);
            }
        }
    }
    var newRestrictions = {selection: newValues.toArray(), selectMissing: newSelectMissing};
    var oldRestrictions = {selection: oldValues.toArray(), selectMissing: oldSelectMissing};
    var facetLabel = ("facetLabel" in this._settings) ? this._settings.facetLabel : "";
    SimileAjax.History.addLengthyAction(function () {
        self.applyRestrictions(newRestrictions);
    }, function () {
        self.applyRestrictions(oldRestrictions);
    }, (selectOnly && !wasOnlyThingSelected) ? String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, facetLabel]) : String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, facetLabel]));
};
Exhibit.CloudFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.CloudFacet.prototype._buildMaps = function () {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var valueToItem = {};
        var missingItems = {};
        var valueType = "text";
        var insert = function (x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [y];
            }
        };
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        this._uiContext.getCollection().getAllItems().visit(function (item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function (value) {
                    insert(item, value, itemToValue);
                    insert(value, item, valueToItem);
                });
            } else {
                missingItems[item] = true;
            }
        });
        this._itemToValue = itemToValue;
        this._valueToItem = valueToItem;
        this._missingItems = missingItems;
        this._valueType = valueType;
    }
};


/* hierarchical-facet.js */
Exhibit.HierarchicalFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    this._expression = null;
    this._uniformGroupingExpression = null;
    this._selections = [];
    this._expanded = {};
    this._settings = {};
    this._dom = null;
    var self = this;
    this._listener = {onRootItemsChanged: function () {
        if ("_cache" in self) {
            delete self._cache;
        }
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.HierarchicalFacet._settingSpecs = {"facetLabel": {type: "text"}, "fixedOrder": {type: "text"}, "sortMode": {type: "text", defaultValue: "value"}, "sortDirection": {type: "text", defaultValue: "forward"}, "othersLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "colorCoder": {type: "text", defaultValue: null}, "collapsible": {type: "boolean", defaultValue: false}, "collapsed": {type: "boolean", defaultValue: false}};
Exhibit.HierarchicalFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.HierarchicalFacet(containerElmt, uiContext);
    Exhibit.HierarchicalFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.HierarchicalFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.HierarchicalFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.HierarchicalFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        var uniformGroupingString = Exhibit.getAttribute(configElmt, "uniformGrouping");
        if (uniformGroupingString != null && uniformGroupingString.length > 0) {
            facet._uniformGroupingExpression = Exhibit.ExpressionParser.parse(uniformGroupingString);
        }
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s;
                 s = selection[i];
                 i++) {
                facet._selections = facet._internalAddSelection({value: s, selectOthers: false});
            }
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "HierarchicalFacet: Error processing configuration of hierarchical facet");
    }
    Exhibit.HierarchicalFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.HierarchicalFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.HierarchicalFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("uniformGrouping" in configuration) {
        facet._uniformGroupingExpression = Exhibit.ExpressionParser.parse(configuration.uniformGrouping);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0;
             i < selection.length;
             i++) {
            facet._selections.push({value: selection[i], selectOthers: false});
        }
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if ("fixedOrder" in facet._settings) {
        var values = facet._settings.fixedOrder.split(";");
        var orderMap = {};
        for (var i = 0;
             i < values.length;
             i++) {
            orderMap[values[i].trim()] = i;
        }
        facet._orderMap = orderMap;
    }
    if ("colorCoder" in facet._settings) {
        facet._colorCoder = facet._uiContext.getExhibit().getComponent(facet._settings.colorCoder);
    }
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
};
Exhibit.HierarchicalFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._colorCoder = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._uniformGroupingExpression = null;
    this._selections = null;
    this._settings = null;
    this._cache = null;
};
Exhibit.HierarchicalFacet.prototype.hasRestrictions = function () {
    return this._selections.length > 0;
};
Exhibit.HierarchicalFacet.prototype.clearAllRestrictions = function () {
    var selections = this._selections;
    this._selections = [];
    if (selections.length > 0) {
        this._notifyCollection();
    }
    return selections;
};
Exhibit.HierarchicalFacet.prototype.applyRestrictions = function (restrictions) {
    this._selections = [].concat(restrictions);
    this._notifyCollection();
};
Exhibit.HierarchicalFacet.prototype.setSelection = function (value, selected) {
    var selection = {value: value, selectOthers: false};
    if (selected) {
        this._selections = this._internalAddSelection(selection);
    } else {
        this._selections = this._internalRemoveSelection(selection);
    }
    this._notifyCollection();
};
Exhibit.HierarchicalFacet.prototype.setselectOthers = function (value, selected) {
    var selection = {value: value, selectOthers: true};
    if (selected) {
        this._selections = this._internalAddSelection(selection);
    } else {
        this._selections = this._internalRemoveSelection(selection);
    }
    this._notifyCollection();
};
Exhibit.HierarchicalFacet.prototype.restrict = function (items) {
    if (this._selections.length == 0) {
        return items;
    }
    this._buildCache();
    var set = new Exhibit.Set();
    var includeNode = function (node) {
        if ("children" in node) {
            includeChildNodes(node.children);
            Exhibit.Set.createIntersection(node.others, items, set);
        } else {
            Exhibit.Set.createIntersection(node.items, items, set);
        }
    };
    var includeChildNodes = function (childNodes) {
        for (var i = 0;
             i < childNodes.length;
             i++) {
            includeNode(childNodes[i]);
        }
    };
    for (var i = 0;
         i < this._selections.length;
         i++) {
        var selection = this._selections[i];
        var node = this._getTreeNode(selection.value);
        if (node) {
            if (selection.selectOthers) {
                Exhibit.Set.createIntersection(node.others, items, set);
            } else {
                includeNode(node);
            }
        }
    }
    return set;
};
Exhibit.HierarchicalFacet.prototype._internalAddSelection = function (selection) {
    var parentToClear = {};
    var childrenToClear = {};
    this._buildCache();
    var cache = this._cache;
    var markClearAncestors = function (value) {
        if (value in cache.valueToParent) {
            var parents = cache.valueToParent[value];
            for (var i = 0;
                 i < parents.length;
                 i++) {
                var parent = parents[i];
                parentToClear[parent] = true;
                markClearAncestors(parent);
            }
        }
    };
    var markClearDescendants = function (value) {
        if (value in cache.valueToChildren) {
            var children = cache.valueToChildren[value];
            for (var i = 0;
                 i < children.length;
                 i++) {
                var child = children[i];
                childrenToClear[child] = true;
                markClearDescendants(child);
            }
        }
    };
    if (selection.value != null) {
        markClearAncestors(selection.value);
        if (selection.selectOthers) {
            parentToClear[selection.value] = true;
        } else {
            childrenToClear[selection.value] = true;
            markClearDescendants(selection.value);
        }
    }
    var oldSelections = this._selections;
    var newSelections = [selection];
    for (var i = 0;
         i < oldSelections.length;
         i++) {
        var s = oldSelections[i];
        if ((!(s.value in parentToClear) || s.selectOthers) && (!(s.value in childrenToClear))) {
            newSelections.push(s);
        }
    }
    return newSelections;
};
Exhibit.HierarchicalFacet.prototype._internalRemoveSelection = function (selection) {
    var oldSelections = this._selections;
    var newSelections = [];
    for (var i = 0;
         i < oldSelections.length;
         i++) {
        var s = oldSelections[i];
        if (s.value != selection.value || s.selectOthers != selection.selectOthers) {
            newSelections.push(s);
        }
    }
    return newSelections;
};
Exhibit.HierarchicalFacet.prototype.update = function (items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    var tree = this._computeFacet(items);
    if (tree) {
        this._constructBody(tree);
    }
    this._dom.valuesContainer.style.display = "block";
};
Exhibit.HierarchicalFacet.prototype._computeFacet = function (items) {
    this._buildCache();
    var database = this._uiContext.getDatabase();
    var sorter = this._getValueSorter();
    var othersLabel = "othersLabel" in this._settings ? this._settings.othersLabel : "(others)";
    var selectionMap = {};
    for (var i = 0;
         i < this._selections.length;
         i++) {
        var s = this._selections[i];
        selectionMap[s.value] = s.selectOthers;
    }
    var processNode = function (node, resultNodes, superset) {
        var selected = (node.value in selectionMap && !selectionMap[node.value]);
        if ("children" in node) {
            var resultNode = {value: node.value, label: node.label, children: [], selected: selected, areOthers: false};
            var superset2 = new Exhibit.Set();
            for (var i = 0;
                 i < node.children.length;
                 i++) {
                var childNode = node.children[i];
                processNode(childNode, resultNode.children, superset2);
            }
            resultNode.children.sort(sorter);
            if (node.others.size() > 0) {
                var othersSelected = (node.value in selectionMap && selectionMap[node.value]);
                var subset = Exhibit.Set.createIntersection(items, node.others);
                if (subset.size() > 0 || othersSelected) {
                    resultNode.children.push({value: node.value, label: othersLabel, count: subset.size(), selected: othersSelected, areOthers: true});
                    superset2.addSet(subset);
                }
            }
            resultNode.count = superset2.size();
            if (selected || resultNode.count > 0 || resultNode.children.length > 0) {
                resultNodes.push(resultNode);
                if (superset != null && superset2.size() > 0) {
                    superset.addSet(superset2);
                }
            }
        } else {
            var subset = Exhibit.Set.createIntersection(items, node.items);
            if (subset.size() > 0 || selected) {
                resultNodes.push({value: node.value, label: node.label, count: subset.size(), selected: selected, areOthers: false});
                if (superset != null && subset.size() > 0) {
                    superset.addSet(subset);
                }
            }
        }
    };
    var nodes = [];
    processNode(this._cache.tree, nodes, null);
    return nodes[0];
};
Exhibit.HierarchicalFacet.prototype._getValueSorter = function () {
    var sortValueFunction = function (a, b) {
        return a.label.localeCompare(b.label);
    };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        sortValueFunction = function (a, b) {
            if (a.label in orderMap) {
                if (b.label in orderMap) {
                    return orderMap[a.label] - orderMap[b.label];
                } else {
                    return -1;
                }
            } else {
                if (b.label in orderMap) {
                    return 1;
                } else {
                    return a.label.localeCompare(b.label);
                }
            }
        };
    } else {
        if (this._cache.valueType == "number") {
            sortValueFunction = function (a, b) {
                a = parseFloat(a.value);
                b = parseFloat(b.value);
                return a < b ? -1 : a > b ? 1 : 0;
            };
        }
    }
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function (a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        };
    }
    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse") {
        sortDirectionFunction = function (a, b) {
            return sortFunction(b, a);
        };
    }
    return sortDirectionFunction;
};
Exhibit.HierarchicalFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.HierarchicalFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](this, this._div, this._settings.facetLabel, function (elmt, evt, target) {
        self._clearSelections();
    }, this._uiContext, this._settings.collapsible, this._settings.collapsed);
    if ("height" in this._settings && this._settings.scroll) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};
Exhibit.HierarchicalFacet.prototype._constructBody = function (tree) {
    var self = this;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructHierarchicalFacetItem" : "constructFlowingHierarchicalFacetItem"];
    var facetHasSelection = this._selections.length > 0;
    var processNode = function (node, div) {
        var hasChildren = ("children" in node);
        var onSelect = function (elmt, evt, target) {
            self._filter(node.value, node.areOthers, node.label, node.selected, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function (elmt, evt, target) {
            self._filter(node.value, node.areOthers, node.label, node.selected, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onToggleChildren = function (elmt, evt, target) {
            var show;
            if (node.value in self._expanded) {
                delete self._expanded[node.value];
                show = false;
            } else {
                self._expanded[node.value] = true;
                show = true;
            }
            dom.showChildren(show);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var dom = constructFacetItemFunction(node.label, node.count, (self._colorCoder != null) ? self._colorCoder.translate(node.value) : null, node.selected, hasChildren, (node.value in self._expanded), facetHasSelection, onSelect, onSelectOnly, onToggleChildren, self._uiContext);
        div.appendChild(dom.elmt);
        if (hasChildren) {
            processChildNodes(node.children, dom.childrenContainer);
        }
    };
    var processChildNodes = function (childNodes, div) {
        for (var i = 0;
             i < childNodes.length;
             i++) {
            processNode(childNodes[i], div);
        }
    };
    processChildNodes(tree.children, containerDiv);
    containerDiv.style.display = "block";
    this._dom.setSelectionCount(this._selections.length);
};
Exhibit.HierarchicalFacet.prototype._filter = function (value, areOthers, label, wasSelected, selectOnly) {
    var self = this;
    var wasSelectedAlone = wasSelected && this._selections.length == 1;
    var selection = {value: value, selectOthers: areOthers};
    var oldRestrictions = this._selections;
    var newRestrictions;
    if (wasSelected) {
        if (selectOnly) {
            if (wasSelectedAlone) {
                newRestrictions = [];
            } else {
                newRestrictions = [selection];
            }
        } else {
            newRestrictions = this._internalRemoveSelection(selection);
        }
    } else {
        if (selectOnly) {
            newRestrictions = [selection];
        } else {
            newRestrictions = this._internalAddSelection(selection);
        }
    }
    SimileAjax.History.addLengthyAction(function () {
        self.applyRestrictions(newRestrictions);
    }, function () {
        self.applyRestrictions(oldRestrictions);
    }, (selectOnly && !wasSelectedAlone) ? String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, this._settings.facetLabel]) : String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, this._settings.facetLabel]));
};
Exhibit.HierarchicalFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.HierarchicalFacet.prototype._buildCache = function () {
    if (!("_cache" in this)) {
        var valueToItem = {};
        var valueType = "text";
        var valueToChildren = {};
        var valueToParent = {};
        var valueToPath = {};
        var values = new Exhibit.Set();
        var insert = function (x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [y];
            }
        };
        var database = this._uiContext.getDatabase();
        var tree = {value: null, label: "(root)", others: new Exhibit.Set(), children: []};
        var expression = this._expression;
        this._uiContext.getCollection().getAllItems().visit(function (item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function (value) {
                    values.add(value);
                    insert(value, item, valueToItem);
                });
            } else {
                tree.others.add(item);
            }
        });
        var groupingExpression = this._uniformGroupingExpression;
        var rootValues = new Exhibit.Set();
        var getParentChildRelationships = function (valueSet) {
            var newValueSet = new Exhibit.Set();
            valueSet.visit(function (value) {
                var results = groupingExpression.evaluateOnItem(value, database);
                if (results.values.size() > 0) {
                    results.values.visit(function (parentValue) {
                        insert(value, parentValue, valueToParent);
                        insert(parentValue, value, valueToChildren);
                        if (!valueSet.contains(parentValue)) {
                            newValueSet.add(parentValue);
                        }
                        return true;
                    });
                } else {
                    rootValues.add(value);
                }
            });
            if (newValueSet.size() > 0) {
                getParentChildRelationships(newValueSet);
            }
        };
        getParentChildRelationships(values);
        var processValue = function (value, nodes, valueSet, path) {
            var label = database.getObject(value, "label");
            var node = {value: value, label: label != null ? label : value};
            nodes.push(node);
            valueToPath[value] = path;
            if (value in valueToChildren) {
                node.children = [];
                var valueSet2 = new Exhibit.Set();
                var childrenValue = valueToChildren[value];
                for (var i = 0;
                     i < childrenValue.length;
                     i++) {
                    processValue(childrenValue[i], node.children, valueSet2, path.concat(i));
                }
                node.others = new Exhibit.Set();
                if (value in valueToItem) {
                    var items = valueToItem[value];
                    for (var i = 0;
                         i < items.length;
                         i++) {
                        var item = items[i];
                        if (!valueSet2.contains(item)) {
                            node.others.add(item);
                            valueSet.add(item);
                        }
                    }
                }
                valueSet.addSet(valueSet2);
            } else {
                node.items = new Exhibit.Set();
                if (value in valueToItem) {
                    var items = valueToItem[value];
                    for (var i = 0;
                         i < items.length;
                         i++) {
                        var item = items[i];
                        node.items.add(item);
                        valueSet.add(item);
                    }
                }
            }
        };
        var index = 0;
        rootValues.visit(function (value) {
            processValue(value, tree.children, new Exhibit.Set(), [index++]);
        });
        this._cache = {tree: tree, valueToChildren: valueToChildren, valueToParent: valueToParent, valueToPath: valueToPath, valueType: valueType};
    }
};
Exhibit.HierarchicalFacet.prototype._getTreeNode = function (value) {
    if (value == null) {
        return this._cache.tree;
    }
    var path = this._cache.valueToPath[value];
    var trace = function (node, path, index) {
        var node2 = node.children[path[index]];
        if (++index < path.length) {
            return trace(node2, path, index);
        } else {
            return node2;
        }
    };
    return(path) ? trace(this._cache.tree, path, 0) : null;
};


/* image-facet.js */
Exhibit.ImageFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    this._expression = null;
    this._valueSet = new Exhibit.Set();
    this._selectMissing = false;
    this._settings = {};
    this._dom = null;
};
Exhibit.ImageFacet._settingSpecs = {"facetLabel": {type: "text"}, "thumbNail": {type: "uri"}, "overlayCounts": {type: "boolean", defaultValue: true}, "fixedOrder": {type: "text"}, "sortMode": {type: "text", defaultValue: "value"}, "sortDirection": {type: "text", defaultValue: "forward"}, "showMissing": {type: "boolean", defaultValue: true}, "missingLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "colorCoder": {type: "text", defaultValue: null}, "collapsible": {type: "boolean", defaultValue: false}, "collapsed": {type: "boolean", defaultValue: false}};
Exhibit.ImageFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.ImageFacet(containerElmt, uiContext);
    Exhibit.ImageFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.ImageFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.ImageFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ImageFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        var imageString = Exhibit.getAttribute(configElmt, "image");
        if (imageString != null && imageString.length > 0) {
            facet._imageExpression = Exhibit.ExpressionParser.parse(imageString);
        }
        var tooltipString = Exhibit.getAttribute(configElmt, "tooltip");
        if (tooltipString != null && tooltipString.length > 0) {
            facet._tooltipExpression = Exhibit.ExpressionParser.parse(tooltipString);
        }
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s;
                 s = selection[i];
                 i++) {
                facet._valueSet.add(s);
            }
        }
        var selectMissing = Exhibit.getAttribute(configElmt, "selectMissing");
        if (selectMissing != null && selectMissing.length > 0) {
            facet._selectMissing = (selectMissing == "true");
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ImageFacet: Error processing configuration of list facet");
    }
    Exhibit.ImageFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.ImageFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ImageFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("image" in configuration) {
        facet._imageExpression = Exhibit.ExpressionParser.parse(configuration.image);
    }
    if ("tooltip" in configuration) {
        facet._tooltipExpression = Exhibit.ExpressionParser.parse(configuration.tooltip);
    }
    if (!(facet._imageExpression)) {
        facet._imageExpression = Exhibit.ExpressionParser.parse("value");
    }
    if (!(facet._tooltipExpression)) {
        facet._tooltipExpression = Exhibit.ExpressionParser.parse("value");
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0;
             i < selection.length;
             i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("selectMissing" in configuration) {
        facet._selectMissing = configuration.selectMissing;
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if ("fixedOrder" in facet._settings) {
        var values = facet._settings.fixedOrder.split(";");
        var orderMap = {};
        for (var i = 0;
             i < values.length;
             i++) {
            orderMap[values[i].trim()] = i;
        }
        facet._orderMap = orderMap;
    }
    if ("colorCoder" in facet._settings) {
        facet._colorCoder = facet._uiContext.getExhibit().getComponent(facet._settings.colorCoder);
    }
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
    facet._cache = new Exhibit.FacetUtilities.Cache(facet._uiContext.getDatabase(), facet._uiContext.getCollection(), facet._expression);
};
Exhibit.ImageFacet.prototype.dispose = function () {
    this._cache.dispose();
    this._cache = null;
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._valueSet = null;
    this._settings = null;
};
Exhibit.ImageFacet.prototype.hasRestrictions = function () {
    return this._valueSet.size() > 0 || this._selectMissing;
};
Exhibit.ImageFacet.prototype.clearAllRestrictions = function () {
    var restrictions = {selection: [], selectMissing: false};
    if (this.hasRestrictions()) {
        this._valueSet.visit(function (v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;
        this._notifyCollection();
    }
    return restrictions;
};
Exhibit.ImageFacet.prototype.applyRestrictions = function (restrictions) {
    this._valueSet = new Exhibit.Set();
    for (var i = 0;
         i < restrictions.selection.length;
         i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;
    this._notifyCollection();
};
Exhibit.ImageFacet.prototype.setSelection = function (value, selected) {
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
    this._notifyCollection();
};
Exhibit.ImageFacet.prototype.setSelectMissing = function (selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
};
Exhibit.ImageFacet.prototype.restrict = function (items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    var set = this._cache.getItemsFromValues(this._valueSet, items);
    if (this._selectMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    return set;
};
Exhibit.ImageFacet.prototype.update = function (items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._constructBody(this._computeFacet(items));
    this._dom.valuesContainer.style.display = "block";
};
Exhibit.ImageFacet.prototype._computeFacet = function (items) {
    var database = this._uiContext.getDatabase();
    var r = this._cache.getValueCountsFromItems(items);
    var entries = r.entries;
    var valueType = r.valueType;
    if (entries.length > 0) {
        var selection = this._valueSet;
        var labeler = valueType == "item" ? function (v) {
            var l = database.getObject(v, "label");
            return l != null ? l : v;
        } : function (v) {
            return v;
        };
        for (var i = 0;
             i < entries.length;
             i++) {
            var entry = entries[i];
            entry.actionLabel = entry.selectionLabel = labeler(entry.value);
            entry.image = this._imageExpression.evaluateSingleOnItem(entry.value, database).value;
            entry.tooltip = this._tooltipExpression.evaluateSingleOnItem(entry.value, database).value;
            entry.selected = selection.contains(entry.value);
        }
        entries.sort(this._createSortFunction(valueType));
    }
    return entries;
};
Exhibit.ImageFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.ImageFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](this, this._div, this._settings.facetLabel, function (elmt, evt, target) {
        self._clearSelections();
    }, this._uiContext, this._settings.collapsible, this._settings.collapsed);
    if ("height" in this._settings && this._settings.scroll) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};
Exhibit.ImageFacet.prototype._constructBody = function (entries) {
    var self = this;
    var shouldOverlayCounts = this._settings.overlayCounts;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
    var facetHasSelection = this._valueSet.size() > 0 || this._selectMissing;
    var constructValue = function (entry) {
        var onSelectOnly = function (elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = document.createElement("span");
        var wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        var image = document.createElement("img");
        image.src = entry.image;
        wrapper.appendChild(image);
        if (shouldOverlayCounts == true) {
            var countDiv = document.createElement("div");
            countDiv.className = "countDiv";
            var countBackground = document.createElement("div");
            countBackground.className = "countBackground";
            countDiv.appendChild(countBackground);
            var innerCount = document.createElement("div");
            innerCount.className = "text";
            innerCount.innerHTML = entry.count;
            countDiv.appendChild(innerCount);
            wrapper.appendChild(countDiv);
        }
        elmt.appendChild(wrapper);
        elmt.className = entry.selected ? "inline-block exhibit-imageFacet-value exhibit-imageFacet-value-selected" : "inline-block exhibit-imageFacet-value";
        elmt.title = entry.count + " " + entry.tooltip;
        SimileAjax.WindowManager.registerEvent(elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
        containerDiv.appendChild(elmt);
    };
    for (var j = 0;
         j < entries.length;
         j++) {
        constructValue(entries[j]);
    }
    containerDiv.style.display = "block";
    this._dom.setSelectionCount(this._valueSet.size() + (this._selectMissing ? 1 : 0));
};
Exhibit.ImageFacet.prototype._filter = function (value, label, selectOnly) {
    var self = this;
    var selected, select, deselect;
    var oldValues = new Exhibit.Set(this._valueSet);
    var oldSelectMissing = this._selectMissing;
    var newValues;
    var newSelectMissing;
    var actionLabel;
    var wasSelected;
    var wasOnlyThingSelected;
    if (value == null) {
        wasSelected = oldSelectMissing;
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 0);
        if (selectOnly) {
            if (oldValues.size() == 0) {
                newSelectMissing = !oldSelectMissing;
            } else {
                newSelectMissing = true;
            }
            newValues = new Exhibit.Set();
        } else {
            newSelectMissing = !oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
        }
    } else {
        wasSelected = oldValues.contains(value);
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 1) && !oldSelectMissing;
        if (selectOnly) {
            newSelectMissing = false;
            newValues = new Exhibit.Set();
            if (!oldValues.contains(value)) {
                newValues.add(value);
            } else {
                if (oldValues.size() > 1 || oldSelectMissing) {
                    newValues.add(value);
                }
            }
        } else {
            newSelectMissing = oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
            if (newValues.contains(value)) {
                newValues.remove(value);
            } else {
                newValues.add(value);
            }
        }
    }
    var newRestrictions = {selection: newValues.toArray(), selectMissing: newSelectMissing};
    var oldRestrictions = {selection: oldValues.toArray(), selectMissing: oldSelectMissing};
    SimileAjax.History.addLengthyAction(function () {
        self.applyRestrictions(newRestrictions);
    }, function () {
        self.applyRestrictions(oldRestrictions);
    }, (selectOnly && !wasOnlyThingSelected) ? String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, this._settings.facetLabel]) : String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, this._settings.facetLabel]));
};
Exhibit.ImageFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.ImageFacet.prototype._createSortFunction = function (valueType) {
    var sortValueFunction = function (a, b) {
        return a.selectionLabel.localeCompare(b.selectionLabel);
    };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        sortValueFunction = function (a, b) {
            if (a.selectionLabel in orderMap) {
                if (b.selectionLabel in orderMap) {
                    return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                } else {
                    return -1;
                }
            } else {
                if (b.selectionLabel in orderMap) {
                    return 1;
                } else {
                    return a.selectionLabel.localeCompare(b.selectionLabel);
                }
            }
        };
    } else {
        if (valueType == "number") {
            sortValueFunction = function (a, b) {
                a = parseFloat(a.value);
                b = parseFloat(b.value);
                return a < b ? -1 : a > b ? 1 : 0;
            };
        }
    }
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function (a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        };
    }
    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse") {
        sortDirectionFunction = function (a, b) {
            return sortFunction(b, a);
        };
    }
    return sortDirectionFunction;
};


/* list-facet.js */
Exhibit.ListFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    this._expression = null;
    this._valueSet = new Exhibit.Set();
    this._selectMissing = false;
    this._delayedUpdateItems = null;
    this._settings = {};
    this._dom = null;
};
Exhibit.ListFacet._settingSpecs = {"facetLabel": {type: "text"}, "fixedOrder": {type: "text"}, "sortMode": {type: "text", defaultValue: "value"}, "sortDirection": {type: "text", defaultValue: "forward"}, "showMissing": {type: "boolean", defaultValue: true}, "missingLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "colorCoder": {type: "text", defaultValue: null}, "collapsible": {type: "boolean", defaultValue: false}, "collapsed": {type: "boolean", defaultValue: false}, "formatter": {type: "text", defaultValue: null}};
Exhibit.ListFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.ListFacet(containerElmt, uiContext);
    Exhibit.ListFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.ListFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.ListFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ListFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s;
                 s = selection[i];
                 i++) {
                facet._valueSet.add(s);
            }
        }
        var selectMissing = Exhibit.getAttribute(configElmt, "selectMissing");
        if (selectMissing != null && selectMissing.length > 0) {
            facet._selectMissing = (selectMissing == "true");
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ListFacet: Error processing configuration of list facet");
    }
    Exhibit.ListFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.ListFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ListFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0;
             i < selection.length;
             i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("selectMissing" in configuration) {
        facet._selectMissing = configuration.selectMissing;
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if ("fixedOrder" in facet._settings) {
        var values = facet._settings.fixedOrder.split(";");
        var orderMap = {};
        for (var i = 0;
             i < values.length;
             i++) {
            orderMap[values[i].trim()] = i;
        }
        facet._orderMap = orderMap;
    }
    if ("colorCoder" in facet._settings) {
        facet._colorCoder = facet._uiContext.getExhibit().getComponent(facet._settings.colorCoder);
    }
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
    if ("formatter" in facet._settings) {
        var formatter = facet._settings.formatter;
        if (formatter != null && formatter.length > 0) {
            try {
                facet._formatter = eval(formatter);
            } catch (e) {
                SimileAjax.Debug.log(e);
            }
        }
    }
    facet._cache = new Exhibit.FacetUtilities.Cache(facet._uiContext.getDatabase(), facet._uiContext.getCollection(), facet._expression);
};
Exhibit.ListFacet.prototype.dispose = function () {
    this._cache.dispose();
    this._cache = null;
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._valueSet = null;
    this._settings = null;
};
Exhibit.ListFacet.prototype.hasRestrictions = function () {
    return this._valueSet.size() > 0 || this._selectMissing;
};
Exhibit.ListFacet.prototype.clearAllRestrictions = function () {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    var restrictions = {selection: [], selectMissing: false};
    if (this.hasRestrictions()) {
        this._valueSet.visit(function (v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;
        var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
        var restricted = "";
        if (newRestrictionSize > 0) {
            arr = Array();
            for (k in this._valueSet._hash) {
                arr.push(k);
            }
            restricted = arr.join("##");
        }
        SimileAjax.RemoteLog.possiblyLog({facetType: "ListFacet", facetLabel: this._settings.facetLabel, operation: "clearAllRestrictions", exhibitSize: totalSize, selectedValues: restricted, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize, oldRestrictionSize: oldRestrictionSize, newRestrictionSize: newRestrictionSize});
    }
    return restrictions;
};
Exhibit.ListFacet.prototype.applyRestrictions = function (restrictions) {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    this._valueSet = new Exhibit.Set();
    for (var i = 0;
         i < restrictions.selection.length;
         i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;
    var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    var restricted = "";
    if (newRestrictionSize > 0) {
        arr = Array();
        for (k in this._valueSet._hash) {
            arr.push(k);
        }
        restricted = arr.join("##");
    }
    SimileAjax.RemoteLog.possiblyLog({facetType: "ListFacet", facetLabel: this._settings.facetLabel, operation: "applyRestrictions", exhibitSize: totalSize, selectedValues: restricted, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize, oldRestrictionSize: oldRestrictionSize, newRestrictionSize: newRestrictionSize});
};
Exhibit.ListFacet.prototype.setSelection = function (value, selected) {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
    var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    var restricted = "";
    if (newRestrictionSize > 0) {
        arr = Array();
        for (k in this._valueSet._hash) {
            arr.push(k);
        }
        restricted = arr.join("##");
    }
    SimileAjax.RemoteLog.possiblyLog({facetType: "ListFacet", facetLabel: this._settings.facetLabel, operation: "setSelection", value: value, selected: selected, exhibitSize: totalSize, selectedValues: restricted, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize, oldRestrictionSize: oldRestrictionSize, newRestrictionSize: newRestrictionSize});
};
Exhibit.ListFacet.prototype.setSelectMissing = function (selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
};
Exhibit.ListFacet.prototype.restrict = function (items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    var set = this._cache.getItemsFromValues(this._valueSet, items);
    if (this._selectMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    return set;
};
Exhibit.ListFacet.prototype.onUncollapse = function () {
    if (this._delayedUpdateItems != null) {
        this.update(this._delayedUpdateItems);
        this._delayedUpdateItems = null;
    }
};
Exhibit.ListFacet.prototype.update = function (items) {
    if (Exhibit.FacetUtilities.isCollapsed(this)) {
        this._delayedUpdateItems = items;
        return;
    }
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._constructBody(this._computeFacet(items));
    this._dom.valuesContainer.style.display = "block";
};
Exhibit.ListFacet.prototype._computeFacet = function (items) {
    var database = this._uiContext.getDatabase();
    var r = this._cache.getValueCountsFromItems(items);
    var entries = r.entries;
    var valueType = r.valueType;
    if (entries.length > 0) {
        var selection = this._valueSet;
        var labeler = valueType == "item" ? function (v) {
            var l = database.getObject(v, "label");
            return l != null ? l : v;
        } : function (v) {
            return v;
        };
        for (var i = 0;
             i < entries.length;
             i++) {
            var entry = entries[i];
            entry.actionLabel = entry.selectionLabel = labeler(entry.value);
            entry.selected = selection.contains(entry.value);
        }
        entries.sort(this._createSortFunction(valueType));
    }
    if (this._settings.showMissing || this._selectMissing) {
        var count = this._cache.countItemsMissingValue(items);
        if (count > 0 || this._selectMissing) {
            var span = document.createElement("span");
            span.innerHTML = ("missingLabel" in this._settings) ? this._settings.missingLabel : Exhibit.FacetUtilities.l10n.missingThisField;
            span.className = "exhibit-facet-value-missingThisField";
            entries.unshift({value: null, count: count, selected: this._selectMissing, selectionLabel: span, actionLabel: Exhibit.FacetUtilities.l10n.missingThisField});
        }
    }
    return entries;
};
Exhibit.ListFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.ListFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](this, this._div, this._settings.facetLabel, function (elmt, evt, target) {
        self._clearSelections();
    }, this._uiContext, this._settings.collapsible, this._settings.collapsed);
    if ("height" in this._settings && this._settings.scroll) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};
Exhibit.ListFacet.prototype._constructBody = function (entries) {
    var self = this;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetItem" : "constructFlowingFacetItem"];
    var facetHasSelection = this._valueSet.size() > 0 || this._selectMissing;
    var constructValue = function (entry) {
        var onSelect = function (elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function (elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = constructFacetItemFunction(entry.selectionLabel, entry.count, (self._colorCoder != null) ? self._colorCoder.translate(entry.value) : null, entry.selected, facetHasSelection, onSelect, onSelectOnly, self._uiContext);
        if (self._formatter) {
            self._formatter(elmt);
        }
        containerDiv.appendChild(elmt);
    };
    for (var j = 0;
         j < entries.length;
         j++) {
        constructValue(entries[j]);
    }
    containerDiv.style.display = "block";
    this._dom.setSelectionCount(this._valueSet.size() + (this._selectMissing ? 1 : 0));
};
Exhibit.ListFacet.prototype._filter = function (value, label, selectOnly) {
    var self = this;
    var selected, select, deselect;
    var oldValues = new Exhibit.Set(this._valueSet);
    var oldSelectMissing = this._selectMissing;
    var newValues;
    var newSelectMissing;
    var actionLabel;
    var wasSelected;
    var wasOnlyThingSelected;
    if (value == null) {
        wasSelected = oldSelectMissing;
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 0);
        if (selectOnly) {
            if (oldValues.size() == 0) {
                newSelectMissing = !oldSelectMissing;
            } else {
                newSelectMissing = true;
            }
            newValues = new Exhibit.Set();
        } else {
            newSelectMissing = !oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
        }
    } else {
        wasSelected = oldValues.contains(value);
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 1) && !oldSelectMissing;
        if (selectOnly) {
            newSelectMissing = false;
            newValues = new Exhibit.Set();
            if (!oldValues.contains(value)) {
                newValues.add(value);
            } else {
                if (oldValues.size() > 1 || oldSelectMissing) {
                    newValues.add(value);
                }
            }
        } else {
            newSelectMissing = oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
            if (newValues.contains(value)) {
                newValues.remove(value);
            } else {
                newValues.add(value);
            }
        }
    }
    var newRestrictions = {selection: newValues.toArray(), selectMissing: newSelectMissing};
    var oldRestrictions = {selection: oldValues.toArray(), selectMissing: oldSelectMissing};
    SimileAjax.History.addLengthyAction(function () {
        self.applyRestrictions(newRestrictions);
    }, function () {
        self.applyRestrictions(oldRestrictions);
    }, (selectOnly && !wasOnlyThingSelected) ? String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, this._settings.facetLabel]) : String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, this._settings.facetLabel]));
};
Exhibit.ListFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.ListFacet.prototype._createSortFunction = function (valueType) {
    var sortValueFunction = function (a, b) {
        return a.selectionLabel.localeCompare(b.selectionLabel);
    };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        sortValueFunction = function (a, b) {
            if (a.selectionLabel in orderMap) {
                if (b.selectionLabel in orderMap) {
                    return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                } else {
                    return -1;
                }
            } else {
                if (b.selectionLabel in orderMap) {
                    return 1;
                } else {
                    return a.selectionLabel.localeCompare(b.selectionLabel);
                }
            }
        };
    } else {
        if (valueType == "number") {
            sortValueFunction = function (a, b) {
                a = parseFloat(a.value);
                b = parseFloat(b.value);
                return a < b ? -1 : a > b ? 1 : 0;
            };
        }
    }
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function (a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        };
    }
    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse") {
        sortDirectionFunction = function (a, b) {
            return sortFunction(b, a);
        };
    }
    return sortDirectionFunction;
};
Exhibit.ListFacet.prototype.exportFacetSelection = function () {
    var s = [];
    this._valueSet.visit(function (v) {
        s.push(v);
    });
    if (s.length > 0) {
        return s.join(",");
    }
};
Exhibit.ListFacet.prototype.importFacetSelection = function (settings) {
    var self = this;
    self.applyRestrictions({selection: settings.split(","), selectMissing: self._selectMissing});
};


/* numeric-range-facet.js */
Exhibit.NumericRangeFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._expression = null;
    this._settings = {};
    this._dom = null;
    this._ranges = [];
    var self = this;
    this._listener = {onRootItemsChanged: function () {
        if ("_rangeIndex" in self) {
            delete self._rangeIndex;
        }
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.NumericRangeFacet._settingSpecs = {"facetLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "interval": {type: "float", defaultValue: 10}, "collapsible": {type: "boolean", defaultValue: false}, "collapsed": {type: "boolean", defaultValue: false}};
Exhibit.NumericRangeFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.NumericRangeFacet(containerElmt, uiContext);
    Exhibit.NumericRangeFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.NumericRangeFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.NumericRangeFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.NumericRangeFacet._settingSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "NumericRangeFacet: Error processing configuration of numeric range facet");
    }
    Exhibit.NumericRangeFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.NumericRangeFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.NumericRangeFacet._settingSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
};
Exhibit.NumericRangeFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._settings = null;
    this._ranges = null;
};
Exhibit.NumericRangeFacet.prototype.hasRestrictions = function () {
    return this._ranges.length > 0;
};
Exhibit.NumericRangeFacet.prototype.clearAllRestrictions = function () {
    var restrictions = [];
    if (this._ranges.length > 0) {
        restrictions = restrictions.concat(this._ranges);
        this._ranges = [];
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
        SimileAjax.RemoteLog.possiblyLog({facetType: "NumericRange", facetLabel: this._settings.facetLabel, operation: "clearAllRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
    }
    return restrictions;
};
Exhibit.NumericRangeFacet.prototype.applyRestrictions = function (restrictions) {
    this._ranges = restrictions;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "NumericRange", facetLabel: this._settings.facetLabel, operation: "applyRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
};
Exhibit.NumericRangeFacet.prototype.setRange = function (from, to, selected) {
    if (selected) {
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                return;
            }
        }
        this._ranges.push({from: from, to: to});
    } else {
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                this._ranges.splice(i, 1);
                break;
            }
        }
    }
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "NumericRange", facetLabel: this._settings.facetLabel, operation: "setRange", from: from, to: to, selected: selected, exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
};
Exhibit.NumericRangeFacet.prototype.restrict = function (items) {
    if (this._ranges.length == 0) {
        return items;
    } else {
        if (this._expression.isPath()) {
            var path = this._expression.getPath();
            var database = this._uiContext.getDatabase();
            var set = new Exhibit.Set();
            for (var i = 0;
                 i < this._ranges.length;
                 i++) {
                var range = this._ranges[i];
                set.addSet(path.rangeBackward(range.from, range.to, false, items, database).values);
            }
            return set;
        } else {
            this._buildRangeIndex();
            var set = new Exhibit.Set();
            for (var i = 0;
                 i < this._ranges.length;
                 i++) {
                var range = this._ranges[i];
                this._rangeIndex.getSubjectsInRange(range.from, range.to, false, set, items);
            }
            return set;
        }
    }
};
Exhibit.NumericRangeFacet.prototype.update = function (items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._reconstruct(items);
    this._dom.valuesContainer.style.display = "block";
};
Exhibit.NumericRangeFacet.prototype._reconstruct = function (items) {
    var self = this;
    var ranges = [];
    var rangeIndex;
    var computeItems;
    if (this._expression.isPath()) {
        var database = this._uiContext.getDatabase();
        var path = this._expression.getPath();
        var propertyID = path.getLastSegment().property;
        var property = database.getProperty(propertyID);
        if (property == null) {
            return null;
        }
        rangeIndex = property.getRangeIndex();
        countItems = function (range) {
            return path.rangeBackward(range.from, range.to, false, items, database).values.size();
        };
    } else {
        this._buildRangeIndex();
        rangeIndex = this._rangeIndex;
        countItems = function (range) {
            return rangeIndex.getSubjectsInRange(range.from, range.to, false, null, items).size();
        };
    }
    var min = rangeIndex.getMin();
    var max = rangeIndex.getMax();
    min = Math.floor(min / this._settings.interval) * this._settings.interval;
    max = Math.ceil((max + this._settings.interval) / this._settings.interval) * this._settings.interval;
    for (var x = min;
         x < max;
         x += this._settings.interval) {
        var range = {from: x, to: x + this._settings.interval, selected: false};
        range.count = countItems(range);
        for (var i = 0;
             i < this._ranges.length;
             i++) {
            var range2 = this._ranges[i];
            if (range2.from == range.from && range2.to == range.to) {
                range.selected = true;
                facetHasSelection = true;
                break;
            }
        }
        ranges.push(range);
    }
    var facetHasSelection = this._ranges.length > 0;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetItem" : "constructFlowingFacetItem"];
    var makeFacetValue = function (from, to, count, selected) {
        var onSelect = function (elmt, evt, target) {
            self._toggleRange(from, to, selected, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function (elmt, evt, target) {
            self._toggleRange(from, to, selected, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = constructFacetItemFunction(from + " - " + to, count, null, selected, facetHasSelection, onSelect, onSelectOnly, self._uiContext);
        containerDiv.appendChild(elmt);
    };
    for (var i = 0;
         i < ranges.length;
         i++) {
        var range = ranges[i];
        if (range.selected || range.count > 0) {
            makeFacetValue(range.from, range.to, range.count, range.selected);
        }
    }
    containerDiv.style.display = "block";
    this._dom.setSelectionCount(this._ranges.length);
};
Exhibit.NumericRangeFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.NumericRangeFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](this, this._div, this._settings.facetLabel, function (elmt, evt, target) {
        self._clearSelections();
    }, this._uiContext, this._settings.collapsible, this._settings.collapsed);
    if ("height" in this._settings) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};
Exhibit.NumericRangeFacet.prototype._toggleRange = function (from, to, wasSelected, singleSelection) {
    var self = this;
    var label = from + " to " + to;
    var wasOnlyThingSelected = (this._ranges.length == 1 && wasSelected);
    if (singleSelection && !wasOnlyThingSelected) {
        var newRestrictions = [
            {from: from, to: to}
        ];
        var oldRestrictions = [].concat(this._ranges);
        SimileAjax.History.addLengthyAction(function () {
            self.applyRestrictions(newRestrictions);
        }, function () {
            self.applyRestrictions(oldRestrictions);
        }, String.substitute(Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"], [label, this._settings.facetLabel]));
    } else {
        SimileAjax.History.addLengthyAction(function () {
            self.setRange(from, to, !wasSelected);
        }, function () {
            self.setRange(from, to, wasSelected);
        }, String.substitute(Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"], [label, this._settings.facetLabel]));
    }
};
Exhibit.NumericRangeFacet.prototype._clearSelections = function () {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = self.clearAllRestrictions();
    }, function () {
        self.applyRestrictions(state.restrictions);
    }, String.substitute(Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"], [this._settings.facetLabel]));
};
Exhibit.NumericRangeFacet.prototype._buildRangeIndex = function () {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        var getter = function (item, f) {
            expression.evaluateOnItem(item, database).values.visit(function (value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
        this._rangeIndex = new Exhibit.Database._RangeIndex(this._uiContext.getCollection().getAllItems(), getter);
    }
};


/* slider-facet.js */
Exhibit.SliderFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._expression = null;
    this._settings = {};
    this._range = {min: null, max: null};
    this._maxRange = {min: null, max: null};
};
Exhibit.SliderFacet._settingsSpecs = {"facetLabel": {type: "text"}, "scroll": {type: "boolean", defaultValue: true}, "height": {type: "text"}, "precision": {type: "float", defaultValue: 1}, "histogram": {type: "boolean", defaultValue: true}, "height": {type: "int", defaultValue: false}, "width": {type: "int", defaultValue: false}, "horizontal": {type: "boolean", defaultValue: true}, "inputText": {type: "boolean", defaultValue: true}, "showMissing": {type: "boolean", defaultValue: true}, "selection": {type: "float", dimensions: 2}};
Exhibit.SliderFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.SliderFacet(containerElmt, uiContext);
    Exhibit.SliderFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.SliderFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.SliderFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.SliderFacet._settingsSpecs, facet._settings);
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        var showMissing = Exhibit.getAttribute(configElmt, "showMissing");
        if (showMissing != null && showMissing.length > 0) {
            facet._showMissing = (showMissing == "true");
        } else {
            facet._showMissing = true;
        }
        if ("selection" in facet._settings) {
            var selection = facet._settings.selection;
            facet._range = {min: selection[0], max: selection[1]};
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "SliderFacet: Error processing configuration of slider facet");
    }
    Exhibit.SliderFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.SliderFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.SliderFacet._settingsSpecs, facet._settings);
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        facet._range = {min: selection[0], max: selection[1]};
    }
    if ("showMissing" in configuration) {
        facet._showMissing = configuration.showMissing;
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    facet._cache = new Exhibit.FacetUtilities.Cache(facet._uiContext.getDatabase(), facet._uiContext.getCollection(), facet._expression);
    facet._maxRange = facet._getMaxRange();
};
Exhibit.SliderFacet.prototype._initializeUI = function () {
    this._dom = SimileAjax.DOM.createDOMFromString(this._div, "<div class='exhibit-facet-header'><span class='exhibit-facet-header-title'>" + this._settings.facetLabel + "</span></div><div class='exhibit-slider' id='slider'></div>");
    this._slider = new Exhibit.SliderFacet.slider(this._dom.slider, this, this._settings.precision, this._settings.horizontal);
};
Exhibit.SliderFacet.prototype.hasRestrictions = function () {
    return(this._range.min && this._range.min != this._maxRange.min) || (this._range.max && this._range.max != this._maxRange.max);
};
Exhibit.SliderFacet.prototype.update = function (items) {
    if (this._settings.histogram) {
        var data = [];
        var n = 75;
        var range = (this._maxRange.max - this._maxRange.min) / n;
        var missingCount = 0;
        var database = this._uiContext.getDatabase();
        if (this._selectMissing) {
            missingCount = this._cache.getItemsMissingValue(items).size();
        }
        if (this._expression.isPath()) {
            var path = this._expression.getPath();
            for (var i = 0;
                 i < n;
                 i++) {
                data[i] = path.rangeBackward(this._maxRange.min + i * range, this._maxRange.min + (i + 1) * range, false, items, database).values.size() + missingCount;
            }
        } else {
            this._buildRangeIndex();
            var rangeIndex = this._rangeIndex;
            for (var i = 0;
                 i < n;
                 i++) {
                data[i] = rangeIndex.getSubjectsInRange(this._maxRange.min + i * range, this._maxRange.min + (i + 1) * range, false, null, items).size() + missingCount;
            }
        }
        this._slider.updateHistogram(data);
    }
    this._slider._setMin(this._range.min);
    this._slider._setMax(this._range.max);
};
Exhibit.SliderFacet.prototype.restrict = function (items) {
    if (!this.hasRestrictions()) {
        return items;
    }
    set = new Exhibit.Set();
    if (this._expression.isPath()) {
        var path = this._expression.getPath();
        var database = this._uiContext.getDatabase();
        set = path.rangeBackward(this._range.min, this._range.max, false, items, database).values;
    } else {
        this._buildRangeIndex();
        var rangeIndex = this._rangeIndex;
        set = rangeIndex.getSubjectsInRange(this._range.min, this._range.max, false, null, items);
    }
    if (this._showMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    return set;
};
Exhibit.SliderFacet.prototype._getMaxRange = function () {
    if (this._expression.getPath()) {
        var path = this._expression.getPath();
        var database = this._uiContext.getDatabase();
        var propertyID = path.getLastSegment().property;
        var property = database.getProperty(propertyID);
        var rangeIndex = property.getRangeIndex();
    } else {
        this._buildRangeIndex();
        var rangeIndex = this._rangeIndex;
    }
    return{min: rangeIndex.getMin(), max: rangeIndex.getMax()};
};
Exhibit.SliderFacet.prototype._buildRangeIndex = function () {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        var getter = function (item, f) {
            expression.evaluateOnItem(item, database).values.visit(function (value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
        this._rangeIndex = new Exhibit.Database._RangeIndex(this._uiContext.getCollection().getAllItems(), getter);
    }
};
Exhibit.SliderFacet.prototype.changeRange = function (range) {
    this._range = range;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "Slider", facetLabel: this._settings.facetLabel, operation: "changeRange", max: range.max, min: range.min, exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
};
Exhibit.SliderFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.SliderFacet.prototype.clearAllRestrictions = function () {
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._slider.resetSliders();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
    SimileAjax.RemoteLog.possiblyLog({facetType: "Slider", facetLabel: this._settings.facetLabel, operation: "clearAllRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
    this._range = this._maxRange;
};
Exhibit.SliderFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expression = null;
    this._settings = null;
    this._range = null;
    this._maxRange = null;
};


/* slider.js */
Exhibit.SliderFacet.slider = function (div, facet, precision) {
    this._div = div;
    this._facet = facet;
    this._prec = precision || 0.1;
    this._maxRange = {min: parseFloat(Exhibit.Util.round(facet._maxRange.min - precision / 2, this._prec)), max: parseFloat(Exhibit.Util.round(facet._maxRange.max + precision / 2, this._prec))};
    this._horizontal = this._facet._settings.horizontal;
    this._scaleFactor = null;
    this._slider1 = {};
    this._slider2 = {};
    this._dom = SimileAjax.DOM.createDOMFromString(div, '<div class="exhibit-slider-bar" id="bar"><div id="slider1"></div><div id="slider2"></div>' + (this._facet._settings.histogram ? '<div class="exhibit-slider-histogram" id="histogram"></div>' : "") + '</div><div class="exhibit-slider-display">' + (this._facet._settings.inputText ? '<input type="text" id="minDisplay"></input> - <input type="text" id="maxDisplay"></input> ' : '<span id="minDisplay"></span> - <span id="maxDisplay"></span>') + "</div>");
    var horizontal = this._horizontal;
    var histogram = this._dom.histogram;
    if (horizontal && histogram) {
        this._dom.bar.style.height = "14px";
        this._dom.bar.style.width = "150px";
    } else {
        if (horizontal && !histogram) {
            this._dom.bar.style.height = "1px";
            this._dom.bar.style.width = "150px";
        } else {
            if (!horizontal && histogram) {
                this._dom.bar.style.height = "150px";
                this._dom.bar.style.width = "14px";
            } else {
                this._dom.bar.style.height = "150px";
                this._dom.bar.style.width = "1px";
            }
        }
    }
    if (this._facet._settings.height) {
        this._dom.bar.style.height = this._facet._settings.height + "px";
    }
    if (this._facet._settings.width) {
        this._dom.bar.style.width = this._facet._settings.width + "px";
    }
    if (histogram) {
        this._dom.histogram.style.height = this._dom.bar.offsetHeight + "px";
        this._dom.histogram.style.width = this._dom.bar.offsetWidth + "px";
    }
    if (horizontal) {
        this._scaleFactor = (this._maxRange.max - this._maxRange.min) / this._dom.bar.offsetWidth;
    } else {
        this._scaleFactor = (this._maxRange.max - this._maxRange.min) / this._dom.bar.offsetHeight;
    }
    this._slider1 = new Exhibit.SliderFacet.slider.slider(this._dom.slider1, this);
    this._slider2 = new Exhibit.SliderFacet.slider.slider(this._dom.slider2, this);
    this._setSlider(this._slider1, this._maxRange.min);
    this._setSlider(this._slider2, this._maxRange.max);
    this._registerDragging();
    if (this._facet._settings.inputText) {
        this._registerInputs();
    }
};
Exhibit.SliderFacet.slider.prototype.resetSliders = function () {
    this._setSlider(this._slider1, this._maxRange.min);
    this._setSlider(this._slider2, this._maxRange.max);
};
Exhibit.SliderFacet.slider.prototype._setSlider = function (slider, value) {
    if (value > this._maxRange.max) {
        value = this._maxRange.max;
    } else {
        if (value < this._maxRange.min) {
            value = this._maxRange.min;
        }
    }
    value = parseFloat(Exhibit.Util.round(value, this._prec));
    slider.value = value;
    if (this._horizontal) {
        slider.div.style.left = ((value - this._maxRange.min) / this._scaleFactor - slider.offset) + "px";
    } else {
        slider.div.style.top = ((value - this._maxRange.min) / this._scaleFactor - slider.offset) + "px";
    }
    this._setDisplays(slider);
};
Exhibit.SliderFacet.slider.prototype._setMin = function (value) {
    var slider = this._slider1.value < this._slider2.value ? this._slider1 : this._slider2;
    var other = (slider == this._slider1) ? this._slider2 : this._slider1;
    value = parseFloat(value);
    if (isNaN(value)) {
        return;
    }
    if (value > other.value) {
        value = other.value;
    }
    this._setSlider(slider, value);
};
Exhibit.SliderFacet.slider.prototype._setMax = function (value) {
    var slider = this._slider1.value > this._slider2.value ? this._slider1 : this._slider2;
    var other = (slider == this._slider1) ? this._slider2 : this._slider1;
    value = parseFloat(value);
    if (isNaN(value)) {
        return;
    }
    if (value < other.value) {
        value = other.value;
    }
    this._setSlider(slider, value);
};
Exhibit.SliderFacet.slider.prototype._setDisplays = function (slider) {
    var other = (slider == this._slider1) ? this._slider2 : this._slider1;
    var min = Math.min(slider.value, other.value);
    var max = Math.max(slider.value, other.value);
    if (this._facet._settings.inputText) {
        this._dom.minDisplay.value = min;
        this._dom.maxDisplay.value = max;
    } else {
        this._dom.minDisplay.innerHTML = min;
        this._dom.maxDisplay.innerHTML = max;
    }
};
Exhibit.SliderFacet.slider.slider = function (div, self) {
    var barEl = self._dom.bar;
    this.div = div;
    if (self._horizontal) {
        this.div.className = "exhibit-slider-handle";
        this.div.style.backgroundImage = 'url("' + Exhibit.urlPrefix + 'images/slider-handle.png")';
        this.offset = this.div.offsetWidth / 2;
        this.min = -this.offset;
        this.max = barEl.offsetWidth - this.offset;
    } else {
        this.div.className = "exhibit-slider-handle2";
        this.div.style.backgroundImage = 'url("' + Exhibit.urlPrefix + 'images/slider-handle2.png")';
        this.offset = this.div.offsetHeight / 2;
        this.min = -this.offset;
        this.max = barEl.offsetHeight - this.offset;
    }
    if (self._facet._settings.histogram) {
        this.div.style.top = (barEl.offsetHeight - 4) + "px";
    }
};
Exhibit.SliderFacet.slider.prototype._registerDragging = function () {
    var self = this;
    var startDrag = function (slider) {
        return function (e) {
            e = e || window.event;
            var onMove = self._horizontal ? onDragH(e, slider) : onDragV(e, slider);
            if (document.attachEvent) {
                document.attachEvent("onmousemove", onMove);
                document.attachEvent("onmouseup", endDrag(slider, onMove));
            } else {
                document.addEventListener("mousemove", onMove, false);
                document.addEventListener("mouseup", endDrag(slider, onMove), false);
            }
            SimileAjax.DOM.cancelEvent(e);
            return false;
        };
    };
    var onDragH = function (e, slider) {
        var origX = e.screenX;
        var origLeft = parseInt(slider.div.style.left);
        var min = slider.min;
        var max = slider.max;
        return function (e) {
            e = e || window.event;
            var dx = e.screenX - origX;
            var newLeft = origLeft + dx;
            if (newLeft < min) {
                newLeft = min;
            }
            if (newLeft > max) {
                newLeft = max;
            }
            slider.div.style.left = newLeft + "px";
            setTimeout(function () {
                var position = parseInt(slider.div.style.left) + slider.offset;
                slider.value = parseFloat(Exhibit.Util.round(position * self._scaleFactor + self._maxRange.min, self._prec));
                self._setDisplays(slider);
            }, 0);
        };
    };
    var onDragV = function (e, slider) {
        var origY = e.screenY;
        var origTop = parseInt(slider.div.style.top);
        var min = slider.min;
        var max = slider.max;
        return function (e) {
            e = e || window.event;
            var dy = e.screenY - origY;
            var newTop = origTop + dy;
            if (newTop < min) {
                newTop = min;
            }
            if (newTop > max) {
                newTop = max;
            }
            slider.div.style.top = newTop + "px";
            setTimeout(function () {
                var position = parseInt(slider.div.style.top) + slider.offset;
                slider.value = parseFloat(Exhibit.Util.round(position * self._scaleFactor + self._maxRange.min, self._prec));
                self._setDisplays(slider);
            }, 0);
        };
    };
    var endDrag = function (slider, moveListener) {
        return function (e) {
            if (document.detachEvent) {
                document.detachEvent("onmousemove", moveListener);
                document.detachEvent("onmouseup", arguments.callee);
            } else {
                document.removeEventListener("mousemove", moveListener, false);
                document.removeEventListener("mouseup", arguments.callee, false);
            }
            self._notifyFacet();
        };
    };
    var attachListeners = function (slider) {
        if (document.attachEvent) {
            slider.div.attachEvent("onmousedown", startDrag(slider));
        } else {
            slider.div.addEventListener("mousedown", startDrag(slider), false);
        }
    };
    attachListeners(this._slider1);
    attachListeners(this._slider2);
};
Exhibit.SliderFacet.slider.prototype._notifyFacet = function () {
    var val1 = this._slider1.value;
    var val2 = this._slider2.value;
    this._facet.changeRange({min: Math.min(val1, val2), max: Math.max(val1, val2)});
};
Exhibit.SliderFacet.slider.prototype.updateHistogram = function (data) {
    var n = data.length;
    var histogram = this._dom.histogram;
    var maxVal = Math.max.apply(Math, data);
    if (!maxVal) {
        return;
    }
    if (this._horizontal) {
        var width = histogram.offsetWidth / n;
        var maxHeight = histogram.offsetHeight;
        var ratio = maxHeight / maxVal;
        histogram.innerHTML = "";
        for (var i = 0;
             i < n;
             i++) {
            var height = Math.ceil(data[i] * ratio);
            var bar = document.createElement("div");
            histogram.appendChild(bar);
            bar.style.width = width + "px";
            bar.style.height = height + "px";
            bar.style.display = height ? "" : "none";
            bar.style.position = "absolute";
            bar.style.top = (maxHeight - height) + "px";
            bar.style.left = i * width + "px";
        }
    } else {
        var width = histogram.offsetHeight / n;
        var maxHeight = histogram.offsetWidth;
        var ratio = maxHeight / maxVal;
        histogram.innerHTML = "";
        for (var i = 0;
             i < n;
             i++) {
            var height = Math.round(data[i] * ratio);
            var bar = document.createElement("div");
            bar.style.height = width;
            bar.style.width = height;
            bar.style.position = "absolute";
            bar.style.left = 0;
            bar.style.top = i * width;
            histogram.appendChild(bar);
        }
    }
};
Exhibit.SliderFacet.slider.prototype._registerInputs = function () {
    var self = this;
    if (document.attachEvent) {
        this._dom.minDisplay.attachEvent("onchange", function (e) {
            self._setMin(this.value);
            self._notifyFacet();
        });
        this._dom.maxDisplay.attachEvent("onchange", function (e) {
            self._setMax(this.value);
            self._notifyFacet();
        });
    } else {
        this._dom.minDisplay.addEventListener("change", function (e) {
            self._setMin(this.value);
            self._notifyFacet();
        }, false);
        this._dom.maxDisplay.addEventListener("change", function (e) {
            self._setMax(this.value);
            self._notifyFacet();
        }, false);
    }
};


/* text-search-facet.js */
Exhibit.TextSearchFacet = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._expressions = [];
    this._text = null;
    this._settings = {};
    this._dom = null;
    this._timerID = null;
    var self = this;
    this._listener = {onRootItemsChanged: function () {
        if ("_itemToValue" in self) {
            delete self._itemToValue;
        }
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.TextSearchFacet._settingSpecs = {"facetLabel": {type: "text"}, "queryParamName": {type: "text"}, "requiresEnter": {type: "boolean", defaultValue: false}};
Exhibit.TextSearchFacet.create = function (configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.TextSearchFacet(containerElmt, uiContext);
    Exhibit.TextSearchFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.TextSearchFacet.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.TextSearchFacet(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TextSearchFacet._settingSpecs, facet._settings);
    try {
        var s = Exhibit.getAttribute(configElmt, "expressions");
        if (s != null && s.length > 0) {
            facet._expressions = Exhibit.ExpressionParser.parseSeveral(s);
        }
        var query = Exhibit.getAttribute(configElmt, "query");
        if (query != null && query.length > 0) {
            facet._text = query;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "TextSearchFacet: Error processing configuration of list facet");
    }
    Exhibit.TextSearchFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    return facet;
};
Exhibit.TextSearchFacet._configure = function (facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TextSearchFacet._settingSpecs, facet._settings);
    if ("expressions" in configuration) {
        for (var i = 0;
             i < configuration.expressions.length;
             i++) {
            facet._expressions.push(Exhibit.ExpressionParser.parse(configuration.expressions[i]));
        }
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0;
             i < selection.length;
             i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("query" in configuration) {
        facet._text = configuration.query;
    }
    if ("queryParamName" in facet._settings) {
        var params = SimileAjax.parseURLParameters();
        if (facet._settings["queryParamName"] in params) {
            facet._text = params[facet._settings["queryParamName"]];
        }
    }
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "";
    }
};
Exhibit.TextSearchFacet.prototype.dispose = function () {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    this._expressions = null;
    this._itemToValue = null;
    this._settings = null;
};
Exhibit.TextSearchFacet.prototype.hasRestrictions = function () {
    return this._text != null;
};
Exhibit.TextSearchFacet.prototype.clearAllRestrictions = function () {
    var restrictions = this._text;
    if (this._text != null) {
        this._text = null;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
        SimileAjax.RemoteLog.possiblyLog({facetType: "TextSearch", facetLabel: this._settings.facetLabel, operation: "clearAllRestrictions", exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
    }
    this._dom.input.value = "";
    return restrictions;
};
Exhibit.TextSearchFacet.prototype.applyRestrictions = function (restrictions) {
    this.setText(restrictions);
};
Exhibit.TextSearchFacet.prototype.setText = function (text) {
    if (text != null) {
        text = text.trim();
        this._dom.input.value = text;
        text = text.length > 0 ? text : null;
    } else {
        this._dom.input.value = "";
    }
    if (text != this._text) {
        this._text = text;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;
        SimileAjax.RemoteLog.possiblyLog({facetType: "TextSearch", facetLabel: this._settings.facetLabel, operation: "setText", text: text, exhibitSize: totalSize, preUpdateSize: preUpdateSize, postUpdateSize: postUpdateSize});
    }
};
Exhibit.TextSearchFacet.prototype.restrict = function (items) {
    if (this._text == null) {
        return items;
    } else {
        this._buildMaps();
        var set = new Exhibit.Set();
        var itemToValue = this._itemToValue;
        var text = this._text.toLowerCase();
        items.visit(function (item) {
            if (item in itemToValue) {
                var values = itemToValue[item];
                for (var v = 0;
                     v < values.length;
                     v++) {
                    if (values[v].indexOf(text) >= 0) {
                        set.add(item);
                        break;
                    }
                }
            }
        });
        return set;
    }
};
Exhibit.TextSearchFacet.prototype.update = function (items) {
};
Exhibit.TextSearchFacet.prototype._notifyCollection = function () {
    this._uiContext.getCollection().onFacetUpdated(this);
};
Exhibit.TextSearchFacet.prototype._initializeUI = function () {
    var self = this;
    this._dom = Exhibit.TextSearchFacet.constructFacetFrame(this._div, this._settings.facetLabel);
    if (this._text != null) {
        this._dom.input.value = this._text;
    }
    SimileAjax.WindowManager.registerEvent(this._dom.input, "keyup", function (elmt, evt, target) {
        self._onTextInputKeyUp(evt);
    });
};
Exhibit.TextSearchFacet.constructFacetFrame = function (div, facetLabel) {
    if (facetLabel !== "" && facetLabel !== null) {
        return SimileAjax.DOM.createDOMFromString(div, "<div class='exhibit-facet-header'><span class='exhibit-facet-header-title'>" + facetLabel + "</span></div><div class='exhibit-text-facet'><input type='text' id='input'></div>");
    } else {
        return SimileAjax.DOM.createDOMFromString(div, "<div class='exhibit-text-facet'><input type='text' id='input'></div>");
    }
};
Exhibit.TextSearchFacet.prototype._onTextInputKeyUp = function (evt) {
    if (this._timerID != null) {
        window.clearTimeout(this._timerID);
    }
    var self = this;
    if (this._settings.requiresEnter == false) {
        this._timerID = window.setTimeout(function () {
            self._onTimeout();
        }, 500);
    } else {
        var newText = this._dom.input.value.trim();
        if (newText.length == 0 || evt.keyCode == 13) {
            this._timerID = window.setTimeout(function () {
                self._onTimeout();
            }, 0);
        }
    }
};
Exhibit.TextSearchFacet.prototype._onTimeout = function () {
    this._timerID = null;
    var newText = this._dom.input.value.trim();
    if (newText.length == 0) {
        newText = null;
    }
    if (newText != this._text) {
        var self = this;
        var oldText = this._text;
        SimileAjax.History.addLengthyAction(function () {
            self.setText(newText);
        }, function () {
            self.setText(oldText);
        }, newText != null ? String.substitute(Exhibit.FacetUtilities.l10n["facetTextSearchActionTitle"], [newText]) : Exhibit.FacetUtilities.l10n["facetClearTextSearchActionTitle"]);
    }
};
Exhibit.TextSearchFacet.prototype._buildMaps = function () {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var allItems = this._uiContext.getCollection().getAllItems();
        var database = this._uiContext.getDatabase();
        if (this._expressions.length > 0) {
            var expressions = this._expressions;
            allItems.visit(function (item) {
                var values = [];
                for (var x = 0;
                     x < expressions.length;
                     x++) {
                    var expression = expressions[x];
                    expression.evaluateOnItem(item, database).values.visit(function (v) {
                        values.push(v.toLowerCase());
                    });
                }
                itemToValue[item] = values;
            });
        } else {
            var propertyIDs = database.getAllProperties();
            allItems.visit(function (item) {
                var values = [];
                for (var p = 0;
                     p < propertyIDs.length;
                     p++) {
                    database.getObjects(item, propertyIDs[p]).visit(function (v) {
                        values.push(v.toLowerCase());
                    });
                }
                itemToValue[item] = values;
            });
        }
        this._itemToValue = itemToValue;
    }
};
Exhibit.TextSearchFacet.prototype.exportFacetSelection = function () {
    return this._text;
};
Exhibit.TextSearchFacet.prototype.importFacetSelection = function (settings) {
    this.setText(settings);
};


/* format-parser.js */
Exhibit.FormatParser = new Object();
Exhibit.FormatParser.parse = function (uiContext, s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    var scanner = new Exhibit.FormatScanner(s, startIndex);
    try {
        return Exhibit.FormatParser._internalParse(uiContext, scanner, results, false);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};
Exhibit.FormatParser.parseSeveral = function (uiContext, s, startIndex, results) {
    startIndex = startIndex || 0;
    results = results || {};
    var scanner = new Exhibit.FormatScanner(s, startIndex);
    try {
        return Exhibit.FormatParser._internalParse(uiContext, scanner, results, true);
    } finally {
        results.index = scanner.token() != null ? scanner.token().start : scanner.index();
    }
};
Exhibit.FormatParser._valueTypes = {"list": true, "number": true, "date": true, "item": true, "text": true, "url": true, "image": true, "currency": true};
Exhibit.FormatParser._internalParse = function (uiContext, scanner, results, several) {
    var Scanner = Exhibit.FormatScanner;
    var token = scanner.token();
    var next = function () {
        scanner.next();
        token = scanner.token();
    };
    var makePosition = function () {
        return token != null ? token.start : scanner.index();
    };
    var enterSetting = function (valueType, settingName, value) {
        uiContext.putSetting("format/" + valueType + "/" + settingName, value);
    };
    var checkKeywords = function (valueType, settingName, keywords) {
        if (token != null && token.type != Scanner.IDENTIFIER && token.value in keywords) {
            enterSetting(valueType, settingName, keywords[token.value]);
            next();
            return false;
        }
        return true;
    };
    var parseNumber = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER) {
                throw new Error("Missing number at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseInteger = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER) {
                throw new Error("Missing integer at position " + makePosition());
            }
            enterSetting(valueType, settingName, Math.round(token.value));
            next();
        }
    };
    var parseNonnegativeInteger = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.NUMBER || token.value < 0) {
                throw new Error("Missing non-negative integer at position " + makePosition());
            }
            enterSetting(valueType, settingName, Math.round(token.value));
            next();
        }
    };
    var parseString = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.STRING) {
                throw new Error("Missing string at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseURL = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.URL) {
                throw new Error("Missing url at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseExpression = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || token.type != Scanner.EXPRESSION) {
                throw new Error("Missing expression at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseExpressionOrString = function (valueType, settingName, keywords) {
        if (checkKeywords(valueType, settingName, keywords)) {
            if (token == null || (token.type != Scanner.EXPRESSION && token.type != Scanner.STRING)) {
                throw new Error("Missing expression or string at position " + makePosition());
            }
            enterSetting(valueType, settingName, token.value);
            next();
        }
    };
    var parseChoices = function (valueType, settingName, choices) {
        if (token == null || token.type != Scanner.IDENTIFIER) {
            throw new Error("Missing option at position " + makePosition());
        }
        for (var i = 0;
             i < choices.length;
             i++) {
            if (token.value == choices[i]) {
                enterSetting(valueType, settingName, token.value);
                next();
                return;
            }
        }
        throw new Error("Unsupported option " + token.value + " for setting " + settingName + " on value type " + valueType + " found at position " + makePosition());
    };
    var parseFlags = function (valueType, settingName, flags, counterFlags) {
        outer:while (token != null && token.type == Scanner.IDENTIFIER) {
            for (var i = 0;
                 i < flags.length;
                 i++) {
                if (token.value == flags[i]) {
                    enterSetting(valueType, settingName + "/" + token.value, true);
                    next();
                    continue outer;
                }
            }
            if (token.value in counterFlags) {
                enterSetting(valueType, settingName + "/" + counterFlags[token.value], false);
                next();
                continue outer;
            }
            throw new Error("Unsupported flag " + token.value + " for setting " + settingName + " on value type " + valueType + " found at position " + makePosition());
        }
    };
    var parseSetting = function (valueType, settingName) {
        switch (valueType) {
            case"number":
                switch (settingName) {
                    case"decimal-digits":
                        parseNonnegativeInteger(valueType, settingName, {"default": -1});
                        return;
                }
                break;
            case"date":
                switch (settingName) {
                    case"time-zone":
                        parseNumber(valueType, settingName, {"default": null});
                        return;
                    case"show":
                        parseChoices(valueType, settingName, ["date", "time", "date-time"]);
                        return;
                    case"mode":
                        parseChoices(valueType, settingName, ["short", "medium", "long", "full"]);
                        enterSetting(valueType, "template", null);
                        return;
                    case"template":
                        parseString(valueType, settingName, {});
                        enterSetting(valueType, "mode", null);
                        return;
                }
                break;
            case"boolean":
                switch (settingName) {
                }
                break;
            case"text":
                switch (settingName) {
                    case"max-length":
                        parseInteger(valueType, settingName, {"none": 0});
                        return;
                }
                break;
            case"image":
                switch (settingName) {
                    case"tooltip":
                        parseExpressionOrString(valueType, settingName, {"none": null});
                        return;
                    case"max-width":
                    case"max-height":
                        parseInteger(valueType, settingName, {"none": -1});
                        return;
                }
                break;
            case"url":
                switch (settingName) {
                    case"target":
                        parseString(valueType, settingName, {"none": null});
                        return;
                    case"external-icon":
                        parseURL(valueType, settingName, {"none": null});
                        return;
                }
                break;
            case"item":
                switch (settingName) {
                    case"title":
                        parseExpression(valueType, settingName, {"default": null});
                        return;
                }
                break;
            case"currency":
                switch (settingName) {
                    case"negative-format":
                        parseFlags(valueType, settingName, ["red", "parentheses", "signed"], {"unsigned": "signed", "no-parenthesis": "parentheses", "black": "red"});
                        return;
                    case"symbol":
                        parseString(valueType, settingName, {"default": "$", "none": null});
                        return;
                    case"symbol-placement":
                        parseChoices(valueType, settingName, ["first", "last", "after-sign"]);
                        return;
                    case"decimal-digits":
                        parseNonnegativeInteger(valueType, settingName, {"default": -1});
                        return;
                }
                break;
            case"list":
                switch (settingName) {
                    case"separator":
                    case"last-separator":
                    case"pair-separator":
                    case"empty-text":
                        parseString(valueType, settingName, {});
                        return;
                }
                break;
        }
        throw new Error("Unsupported setting called " + settingName + " for value type " + valueType + " found at position " + makePosition());
    };
    var parseSettingList = function (valueType) {
        while (token != null && token.type == Scanner.IDENTIFIER) {
            var settingName = token.value;
            next();
            if (token == null || token.type != Scanner.DELIMITER || token.value != ":") {
                throw new Error("Missing : at position " + makePosition());
            }
            next();
            parseSetting(valueType, settingName);
            if (token == null || token.type != Scanner.DELIMITER || token.value != ";") {
                break;
            } else {
                next();
            }
        }
    };
    var parseRule = function () {
        if (token == null || token.type != Scanner.IDENTIFIER) {
            throw new Error("Missing value type at position " + makePosition());
        }
        var valueType = token.value;
        if (!(valueType in Exhibit.FormatParser._valueTypes)) {
            throw new Error("Unsupported value type " + valueType + " at position " + makePosition());
        }
        next();
        if (token != null && token.type == Scanner.DELIMITER && token.value == "{") {
            next();
            parseSettingList(valueType);
            if (token == null || token.type != Scanner.DELIMITER || token.value != "}") {
                throw new Error("Missing } at position " + makePosition());
            }
            next();
        }
        return valueType;
    };
    var parseRuleList = function () {
        var valueType = "text";
        while (token != null && token.type == Scanner.IDENTIFIER) {
            valueType = parseRule();
        }
        return valueType;
    };
    if (several) {
        return parseRuleList();
    } else {
        return parseRule();
    }
};
Exhibit.FormatScanner = function (text, startIndex) {
    this._text = text + " ";
    this._maxIndex = text.length;
    this._index = startIndex;
    this.next();
};
Exhibit.FormatScanner.DELIMITER = 0;
Exhibit.FormatScanner.NUMBER = 1;
Exhibit.FormatScanner.STRING = 2;
Exhibit.FormatScanner.IDENTIFIER = 3;
Exhibit.FormatScanner.URL = 4;
Exhibit.FormatScanner.EXPRESSION = 5;
Exhibit.FormatScanner.COLOR = 6;
Exhibit.FormatScanner.prototype.token = function () {
    return this._token;
};
Exhibit.FormatScanner.prototype.index = function () {
    return this._index;
};
Exhibit.FormatScanner.prototype.next = function () {
    this._token = null;
    var self = this;
    var skipSpaces = function (x) {
        while (x < self._maxIndex && " \t\r\n".indexOf(self._text.charAt(x)) >= 0) {
            x++;
        }
        return x;
    };
    this._index = skipSpaces(this._index);
    if (this._index < this._maxIndex) {
        var c1 = this._text.charAt(this._index);
        var c2 = this._text.charAt(this._index + 1);
        if ("{}(),:;".indexOf(c1) >= 0) {
            this._token = {type: Exhibit.FormatScanner.DELIMITER, value: c1, start: this._index, end: this._index + 1};
            this._index++;
        } else {
            if ("\"'".indexOf(c1) >= 0) {
                var i = this._index + 1;
                while (i < this._maxIndex) {
                    if (this._text.charAt(i) == c1 && this._text.charAt(i - 1) != "\\") {
                        break;
                    }
                    i++;
                }
                if (i < this._maxIndex) {
                    this._token = {type: Exhibit.FormatScanner.STRING, value: this._text.substring(this._index + 1, i).replace(/\\'/g, "'").replace(/\\"/g, '"'), start: this._index, end: i + 1};
                    this._index = i + 1;
                } else {
                    throw new Error("Unterminated string starting at " + this._index);
                }
            } else {
                if (c1 == "#") {
                    var i = this._index + 1;
                    while (i < this._maxIndex && this._isHexDigit(this._text.charAt(i))) {
                        i++;
                    }
                    this._token = {type: Exhibit.FormatScanner.COLOR, value: this._text.substring(this._index, i), start: this._index, end: i};
                    this._index = i;
                } else {
                    if (this._isDigit(c1)) {
                        var i = this._index;
                        while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                            i++;
                        }
                        if (i < this._maxIndex && this._text.charAt(i) == ".") {
                            i++;
                            while (i < this._maxIndex && this._isDigit(this._text.charAt(i))) {
                                i++;
                            }
                        }
                        this._token = {type: Exhibit.FormatScanner.NUMBER, value: parseFloat(this._text.substring(this._index, i)), start: this._index, end: i};
                        this._index = i;
                    } else {
                        var i = this._index;
                        while (i < this._maxIndex) {
                            var j = this._text.substr(i).search(/\W/);
                            if (j > 0) {
                                i += j;
                            } else {
                                if ("-".indexOf(this._text.charAt(i)) >= 0) {
                                    i++;
                                } else {
                                    break;
                                }
                            }
                        }
                        var identifier = this._text.substring(this._index, i);
                        while (true) {
                            if (identifier == "url") {
                                var openParen = skipSpaces(i);
                                if (this._text.charAt(openParen) == "(") {
                                    var closeParen = this._text.indexOf(")", openParen);
                                    if (closeParen > 0) {
                                        this._token = {type: Exhibit.FormatScanner.URL, value: this._text.substring(openParen + 1, closeParen), start: this._index, end: closeParen + 1};
                                        this._index = closeParen + 1;
                                        break;
                                    } else {
                                        throw new Error("Missing ) to close url at " + this._index);
                                    }
                                }
                            } else {
                                if (identifier == "expression") {
                                    var openParen = skipSpaces(i);
                                    if (this._text.charAt(openParen) == "(") {
                                        var o = {};
                                        var expression = Exhibit.ExpressionParser.parse(this._text, openParen + 1, o);
                                        var closeParen = skipSpaces(o.index);
                                        if (this._text.charAt(closeParen) == ")") {
                                            this._token = {type: Exhibit.FormatScanner.EXPRESSION, value: expression, start: this._index, end: closeParen + 1};
                                            this._index = closeParen + 1;
                                            break;
                                        } else {
                                            throw new Error("Missing ) to close expression at " + o.index);
                                        }
                                    }
                                }
                            }
                            this._token = {type: Exhibit.FormatScanner.IDENTIFIER, value: identifier, start: this._index, end: i};
                            this._index = i;
                            break;
                        }
                    }
                }
            }
        }
    }
};
Exhibit.FormatScanner.prototype._isDigit = function (c) {
    return"0123456789".indexOf(c) >= 0;
};
Exhibit.FormatScanner.prototype._isHexDigit = function (c) {
    return"0123456789abcdefABCDEF".indexOf(c) >= 0;
};


/* formatter.js */
Exhibit.Formatter = new Object();
Exhibit.Formatter.createListDelimiter = function (parentElmt, count, uiContext) {
    var separator = uiContext.getSetting("format/list/separator");
    var lastSeparator = uiContext.getSetting("format/list/last-separator");
    var pairSeparator = uiContext.getSetting("format/list/pair-separator");
    if (typeof separator != "string") {
        separator = Exhibit.Formatter.l10n.listSeparator;
    }
    if (typeof lastSeparator != "string") {
        lastSeparator = Exhibit.Formatter.l10n.listLastSeparator;
    }
    if (typeof pairSeparator != "string") {
        pairSeparator = Exhibit.Formatter.l10n.listPairSeparator;
    }
    var f = function () {
        if (f.index > 0 && f.index < count) {
            if (count > 2) {
                parentElmt.appendChild(document.createTextNode((f.index == count - 1) ? lastSeparator : separator));
            } else {
                parentElmt.appendChild(document.createTextNode(pairSeparator));
            }
        }
        f.index++;
    };
    f.index = 0;
    return f;
};
Exhibit.Formatter._lessThanRegex = /</g;
Exhibit.Formatter._greaterThanRegex = />/g;
Exhibit.Formatter.encodeAngleBrackets = function (s) {
    return s.replace(Exhibit.Formatter._lessThanRegex, "&lt;").replace(Exhibit.Formatter._greaterThanRegex, "&gt;");
};
Exhibit.Formatter._ListFormatter = function (uiContext) {
    this._uiContext = uiContext;
    this._separator = uiContext.getSetting("format/list/separator");
    this._lastSeparator = uiContext.getSetting("format/list/last-separator");
    this._pairSeparator = uiContext.getSetting("format/list/pair-separator");
    this._emptyText = uiContext.getSetting("format/list/empty-text");
    if (typeof this._separator != "string") {
        this._separator = Exhibit.Formatter.l10n.listSeparator;
    }
    if (typeof this._lastSeparator != "string") {
        this._lastSeparator = Exhibit.Formatter.l10n.listLastSeparator;
    }
    if (typeof this._pairSeparator != "string") {
        this._pairSeparator = Exhibit.Formatter.l10n.listPairSeparator;
    }
};
Exhibit.Formatter._ListFormatter.prototype.formatList = function (values, count, valueType, appender) {
    var uiContext = this._uiContext;
    var self = this;
    if (count == 0) {
        if (this._emptyText != null && this._emptyText.length > 0) {
            appender(document.createTextNode(this._emptyText));
        }
    } else {
        if (count == 1) {
            values.visit(function (v) {
                uiContext.format(v, valueType, appender);
            });
        } else {
            var index = 0;
            if (count == 2) {
                values.visit(function (v) {
                    uiContext.format(v, valueType, appender);
                    index++;
                    if (index == 1) {
                        appender(document.createTextNode(self._pairSeparator));
                    }
                });
            } else {
                values.visit(function (v) {
                    uiContext.format(v, valueType, appender);
                    index++;
                    if (index < count) {
                        appender(document.createTextNode((index == count - 1) ? self._lastSeparator : self._separator));
                    }
                });
            }
        }
    }
};
Exhibit.Formatter._TextFormatter = function (uiContext) {
    this._maxLength = uiContext.getSetting("format/text/max-length");
    if (typeof this._maxLength == "number") {
        this._maxLength = Math.max(3, Math.round(this._maxLength));
    } else {
        this._maxLength = 0;
    }
};
Exhibit.Formatter._TextFormatter.prototype.format = function (value, appender) {
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    appender(span);
};
Exhibit.Formatter._TextFormatter.prototype.formatText = function (value) {
    if (Exhibit.params.safe) {
        value = Exhibit.Formatter.encodeAngleBrackets(value);
    }
    if (this._maxLength == 0 || value.length <= this._maxLength) {
        return value;
    } else {
        return value.substr(0, this._maxLength) + Exhibit.Formatter.l10n.textEllipsis;
    }
};
Exhibit.Formatter._BooleanFormatter = function (uiContext) {
};
Exhibit.Formatter._BooleanFormatter.prototype.format = function (value, appender) {
    var span = document.createElement("span");
    span.innerHTML = this.formatText(value);
    appender(span);
};
Exhibit.Formatter._BooleanFormatter.prototype.formatText = function (value) {
    return(typeof value == "boolean" ? value : (typeof value == "string" ? (value == "true") : false)) ? Exhibit.Formatter.l10n.booleanTrue : Exhibit.Formatter.l10n.booleanFalse;
};
Exhibit.Formatter._NumberFormatter = function (uiContext) {
    this._decimalDigits = uiContext.getSetting("format/number/decimal-digits");
    if (typeof this._decimalDigits == "number") {
        this._decimalDigits = Math.max(-1, Math.round(this._decimalDigits));
    } else {
        this._decimalDigits = -1;
    }
};
Exhibit.Formatter._NumberFormatter.prototype.format = function (value, appender) {
    appender(document.createTextNode(this.formatText(value)));
};
Exhibit.Formatter._NumberFormatter.prototype.formatText = function (value) {
    if (this._decimalDigits == -1) {
        return value.toString();
    } else {
        return new Number(value).toFixed(this._decimalDigits);
    }
};
Exhibit.Formatter._ImageFormatter = function (uiContext) {
    this._uiContext = uiContext;
    this._maxWidth = uiContext.getSetting("format/image/max-width");
    if (typeof this._maxWidth == "number") {
        this._maxWidth = Math.max(-1, Math.round(this._maxWidth));
    } else {
        this._maxWidth = -1;
    }
    this._maxHeight = uiContext.getSetting("format/image/max-height");
    if (typeof this._maxHeight == "number") {
        this._maxHeight = Math.max(-1, Math.round(this._maxHeight));
    } else {
        this._maxHeight = -1;
    }
    this._tooltip = uiContext.getSetting("format/image/tooltip");
};
Exhibit.Formatter._ImageFormatter.prototype.format = function (value, appender) {
    if (Exhibit.params.safe) {
        value = value.trim().startsWith("javascript:") ? "" : value;
    }
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
Exhibit.Formatter._URLFormatter = function (uiContext) {
    this._target = uiContext.getSetting("format/url/target");
    this._externalIcon = uiContext.getSetting("format/url/external-icon");
};
Exhibit.Formatter._URLFormatter.prototype.format = function (value, appender) {
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
    if (Exhibit.params.safe) {
        value = value.trim().startsWith("javascript:") ? "" : value;
    }
    return value;
};
Exhibit.Formatter._CurrencyFormatter = function (uiContext) {
    this._decimalDigits = uiContext.getSetting("format/currency/decimal-digits");
    if (typeof this._decimalDigits == "number") {
        this._decimalDigits = Math.max(-1, Math.round(this._decimalDigits));
    } else {
        this._decimalDigits = 2;
    }
    this._symbol = uiContext.getSetting("format/currency/symbol");
    if (this._symbol == null) {
        this._symbol = Exhibit.Formatter.l10n.currencySymbol;
    }
    this._symbolPlacement = uiContext.getSetting("format/currency/symbol-placement");
    if (this._symbolPlacement == null) {
        this._symbol = Exhibit.Formatter.l10n.currencySymbolPlacement;
    }
    this._negativeFormat = {signed: uiContext.getBooleanSetting("format/currency/negative-format/signed", Exhibit.Formatter.l10n.currencyShowSign), red: uiContext.getBooleanSetting("format/currency/negative-format/red", Exhibit.Formatter.l10n.currencyShowRed), parentheses: uiContext.getBooleanSetting("format/currency/negative-format/parentheses", Exhibit.Formatter.l10n.currencyShowParentheses)};
};
Exhibit.Formatter._CurrencyFormatter.prototype.format = function (value, appender) {
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
Exhibit.Formatter._ItemFormatter = function (uiContext) {
    this._uiContext = uiContext;
    this._title = uiContext.getSetting("format/item/title");
};
Exhibit.Formatter._ItemFormatter.prototype.format = function (value, appender) {
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
Exhibit.Formatter._DateFormatter = function (uiContext) {
    this._timeZone = uiContext.getSetting("format/date/time-zone");
    if (!(typeof this._timeZone == "number")) {
        this._timeZone = -(new Date().getTimezoneOffset()) / 60;
    }
    this._timeZoneOffset = this._timeZone * 3600000;
    var mode = uiContext.getSetting("format/date/mode");
    var show = uiContext.getSetting("format/date/show");
    var template = null;
    switch (mode) {
        case"short":
            template = show == "date" ? Exhibit.Formatter.l10n.dateShortFormat : (show == "time" ? Exhibit.Formatter.l10n.timeShortFormat : Exhibit.Formatter.l10n.dateTimeShortFormat);
            break;
        case"medium":
            template = show == "date" ? Exhibit.Formatter.l10n.dateMediumFormat : (show == "time" ? Exhibit.Formatter.l10n.timeMediumFormat : Exhibit.Formatter.l10n.dateTimeMediumFormat);
            break;
        case"long":
            template = show == "date" ? Exhibit.Formatter.l10n.dateLongFormat : (show == "time" ? Exhibit.Formatter.l10n.timeLongFormat : Exhibit.Formatter.l10n.dateTimeLongFormat);
            break;
        case"full":
            template = show == "date" ? Exhibit.Formatter.l10n.dateFullFormat : (show == "time" ? Exhibit.Formatter.l10n.timeFullFormat : Exhibit.Formatter.l10n.dateTimeFullFormat);
            break;
        default:
            template = uiContext.getSetting("format/date/template");
    }
    if (typeof template != "string") {
        template = Exhibit.Formatter.l10n.dateTimeDefaultFormat;
    }
    var segments = [];
    var placeholders = template.match(/\b\w+\b/g);
    var startIndex = 0;
    for (var p = 0;
         p < placeholders.length;
         p++) {
        var placeholder = placeholders[p];
        var index = template.indexOf(placeholder, startIndex);
        if (index > startIndex) {
            segments.push(template.substring(startIndex, index));
        }
        var retriever = Exhibit.Formatter._DateFormatter._retrievers[placeholder];
        if (typeof retriever == "function") {
            segments.push(retriever);
        } else {
            segments.push(placeholder);
        }
        startIndex = index + placeholder.length;
    }
    if (startIndex < template.length) {
        segments.push(template.substr(startIndex));
    }
    this._segments = segments;
};
Exhibit.Formatter._DateFormatter.prototype.format = function (value, appender) {
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
Exhibit.Formatter._DateFormatter._pad = function (n) {
    return n < 10 ? ("0" + n) : n.toString();
};
Exhibit.Formatter._DateFormatter._pad3 = function (n) {
    return n < 10 ? ("00" + n) : (n < 100 ? ("0" + n) : n.toString());
};
Exhibit.Formatter._DateFormatter._retrievers = {"d": function (date) {
    return date.getUTCDate().toString();
}, "dd": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCDate());
}, "EEE": function (date) {
    return Exhibit.Formatter.l10n.shortDaysOfWeek[date.getUTCDay()];
}, "EEEE": function (date) {
    return Exhibit.Formatter.l10n.daysOfWeek[date.getUTCDay()];
}, "MM": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCMonth() + 1);
}, "MMM": function (date) {
    return Exhibit.Formatter.l10n.shortMonths[date.getUTCMonth()];
}, "MMMM": function (date) {
    return Exhibit.Formatter.l10n.months[date.getUTCMonth()];
}, "yy": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCFullYear() % 100);
}, "yyyy": function (date) {
    var y = date.getUTCFullYear();
    return y > 0 ? y.toString() : (1 - y);
}, "G": function (date) {
    var y = date.getUTCYear();
    return y > 0 ? Exhibit.Formatter.l10n.commonEra : Exhibit.Formatter.l10n.beforeCommonEra;
}, "HH": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCHours());
}, "hh": function (date) {
    var h = date.getUTCHours();
    return Exhibit.Formatter._DateFormatter._pad(h == 0 ? 12 : (h > 12 ? h - 12 : h));
}, "h": function (date) {
    var h = date.getUTCHours();
    return(h == 0 ? 12 : (h > 12 ? h - 12 : h)).toString();
}, "a": function (date) {
    return date.getUTCHours() < 12 ? Exhibit.Formatter.l10n.beforeNoon : Exhibit.Formatter.l10n.afterNoon;
}, "A": function (date) {
    return date.getUTCHours() < 12 ? Exhibit.Formatter.l10n.BeforeNoon : Exhibit.Formatter.l10n.AfterNoon;
}, "mm": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCMinutes());
}, "ss": function (date) {
    return Exhibit.Formatter._DateFormatter._pad(date.getUTCSeconds());
}, "S": function (date) {
    return Exhibit.Formatter._DateFormatter._pad3(date.getUTCMilliseconds());
}};
Exhibit.Formatter._constructors = {"number": Exhibit.Formatter._NumberFormatter, "date": Exhibit.Formatter._DateFormatter, "text": Exhibit.Formatter._TextFormatter, "boolean": Exhibit.Formatter._BooleanFormatter, "image": Exhibit.Formatter._ImageFormatter, "url": Exhibit.Formatter._URLFormatter, "item": Exhibit.Formatter._ItemFormatter, "currency": Exhibit.Formatter._CurrencyFormatter};


/* lens.js */
Exhibit.LensRegistry = function (parentRegistry) {
    this._parentRegistry = parentRegistry;
    this._defaultLens = null;
    this._typeToLens = {};
    this._editLensTemplates = {};
    this._submissionLensTemplates = {};
    this._lensSelectors = [];
};
Exhibit.LensRegistry.prototype.registerDefaultLens = function (elmtOrURL) {
    this._defaultLens = (typeof elmtOrURL == "string") ? elmtOrURL : elmtOrURL.cloneNode(true);
};
Exhibit.LensRegistry.prototype.registerLensForType = function (elmtOrURL, type) {
    if (typeof elmtOrURL == "string") {
        this._typeToLens[type] = elmtOrURL;
    }
    var role = Exhibit.getRoleAttribute(elmtOrURL);
    if (role == "lens") {
        this._typeToLens[type] = elmtOrURL.cloneNode(true);
    } else {
        if (role == "edit-lens") {
            this._editLensTemplates[type] = elmtOrURL.cloneNode(true);
        } else {
            if (role == "submission-lens") {
                this._submissionLensTemplates[type] = elmtOrURL.cloneNode(true);
            } else {
                SimileAjax.Debug.warn("Unknown lens type " + elmtOrURL);
            }
        }
    }
};
Exhibit.LensRegistry.prototype.addLensSelector = function (lensSelector) {
    this._lensSelectors.unshift(lensSelector);
};
Exhibit.LensRegistry.prototype.getLens = function (itemID, uiContext) {
    return uiContext.isBeingEdited(itemID) ? this.getEditLens(itemID, uiContext) : this.getNormalLens(itemID, uiContext);
};
Exhibit.LensRegistry.prototype.getNormalLens = function (itemID, uiContext) {
    var db = uiContext.getDatabase();
    for (var i = 0;
         i < this._lensSelectors.length;
         i++) {
        var lens = this._lensSelectors[i](itemID, db);
        if (lens != null) {
            return lens;
        }
    }
    var type = db.getObject(itemID, "type");
    if (type in this._typeToLens) {
        return this._typeToLens[type];
    }
    if (this._defaultLens != null) {
        return this._defaultLens;
    }
    if (this._parentRegistry) {
        return this._parentRegistry.getLens(itemID, uiContext);
    }
    return null;
};
Exhibit.LensRegistry.prototype.getEditLens = function (itemID, uiContext) {
    var type = uiContext.getDatabase().getObject(itemID, "type");
    if (type in this._editLensTemplates) {
        return this._editLensTemplates[type];
    } else {
        return this._parentRegistry && this._parentRegistry.getEditLens(itemID, uiContext);
    }
};
Exhibit.LensRegistry.prototype.createLens = function (itemID, div, uiContext, opts) {
    var lens = new Exhibit.Lens();
    if (uiContext.getDatabase().isNewItem(itemID)) {
        SimileAjax.jQuery(div).addClass("newItem");
    }
    opts = opts || {};
    var lensTemplate = opts.lensTemplate || this.getLens(itemID, uiContext);
    if (lensTemplate == null) {
        lens._constructDefaultUI(itemID, div, uiContext);
    } else {
        if (typeof lensTemplate == "string") {
            lens._constructFromLensTemplateURL(itemID, div, uiContext, lensTemplate, opts);
        } else {
            lens._constructFromLensTemplateDOM(itemID, div, uiContext, lensTemplate, opts);
        }
    }
    return lens;
};
Exhibit.LensRegistry.prototype.createEditLens = function (itemID, div, uiContext, opts) {
    opts = opts || {};
    opts.lensTemplate = this.getEditLens(itemID, uiContext);
    return this.createLens(itemID, div, uiContext, opts);
};
Exhibit.LensRegistry.prototype.createNormalLens = function (itemID, div, uiContext, opts) {
    opts = opts || {};
    opts.lensTemplate = this.getNormalLens(itemID, uiContext);
    return this.createLens(itemID, div, uiContext, opts);
};
Exhibit.Lens = function () {
};
Exhibit.Lens._commonProperties = null;
Exhibit.Lens.prototype._constructDefaultUI = function (itemID, div, uiContext) {
    var database = uiContext.getDatabase();
    if (Exhibit.Lens._commonProperties == null) {
        Exhibit.Lens._commonProperties = database.getAllProperties();
    }
    var properties = Exhibit.Lens._commonProperties;
    var label = database.getObject(itemID, "label");
    label = label != null ? label : itemID;
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    var template = {elmt: div, className: "exhibit-lens", children: [
        {tag: "div", className: "exhibit-lens-title", title: label, children: [label + " (", {tag: "a", href: Exhibit.Persistence.getItemLink(itemID), target: "_blank", children: [Exhibit.l10n.itemLinkLabel]}, ")"]},
        {tag: "div", className: "exhibit-lens-body", children: [
            {tag: "table", className: "exhibit-lens-properties", field: "propertiesTable"}
        ]}
    ]};
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    div.setAttribute("ex:itemID", itemID);
    var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, properties, database);
    for (var j = 0;
         j < pairs.length;
         j++) {
        var pair = pairs[j];
        var tr = dom.propertiesTable.insertRow(j);
        tr.className = "exhibit-lens-property";
        var tdName = tr.insertCell(0);
        tdName.className = "exhibit-lens-property-name";
        tdName.innerHTML = pair.propertyLabel + ": ";
        var tdValues = tr.insertCell(1);
        tdValues.className = "exhibit-lens-property-values";
        if (pair.valueType == "item") {
            for (var m = 0;
                 m < pair.values.length;
                 m++) {
                if (m > 0) {
                    tdValues.appendChild(document.createTextNode(", "));
                }
                tdValues.appendChild(Exhibit.UI.makeItemSpan(pair.values[m], null, uiContext));
            }
        } else {
            for (var m = 0;
                 m < pair.values.length;
                 m++) {
                if (m > 0) {
                    tdValues.appendChild(document.createTextNode(", "));
                }
                tdValues.appendChild(Exhibit.UI.makeValueSpan(pair.values[m], pair.valueType));
            }
        }
    }
};
Exhibit.Lens.prototype._constructDefaultEditingUI = function (itemID, div, uiContext) {
};
Exhibit.Lens._compiledTemplates = {};
Exhibit.Lens._handlers = ["onblur", "onfocus", "onkeydown", "onkeypress", "onkeyup", "onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onclick", "onresize", "onscroll"];
Exhibit.Lens.prototype._constructFromLensTemplateURL = function (itemID, div, uiContext, lensTemplateURL) {
    var job = {lens: this, itemID: itemID, div: div, uiContext: uiContext, opts: opts};
    var compiledTemplate = Exhibit.Lens._compiledTemplates[lensTemplateURL];
    if (compiledTemplate == null) {
        Exhibit.Lens._startCompilingTemplate(lensTemplateURL, job);
    } else {
        if (!compiledTemplate.compiled) {
            compiledTemplate.jobs.push(job);
        } else {
            job.template = compiledTemplate;
            Exhibit.Lens._performConstructFromLensTemplateJob(job);
        }
    }
};
Exhibit.Lens.prototype._constructFromLensTemplateDOM = function (itemID, div, uiContext, lensTemplateNode, opts) {
    var job = {lens: this, itemID: itemID, div: div, uiContext: uiContext, opts: opts};
    var id = lensTemplateNode.id;
    if (id == null || id.length == 0) {
        id = "exhibitLensTemplate" + Math.floor(Math.random() * 10000);
        lensTemplateNode.id = id;
    }
    var compiledTemplate = Exhibit.Lens._compiledTemplates[id];
    if (compiledTemplate == null) {
        compiledTemplate = {url: id, template: Exhibit.Lens.compileTemplate(lensTemplateNode, false, uiContext), compiled: true, jobs: []};
        Exhibit.Lens._compiledTemplates[id] = compiledTemplate;
    }
    job.template = compiledTemplate;
    Exhibit.Lens._performConstructFromLensTemplateJob(job);
};
Exhibit.Lens._startCompilingTemplate = function (lensTemplateURL, job) {
    var compiledTemplate = {url: lensTemplateURL, template: null, compiled: false, jobs: [job]};
    Exhibit.Lens._compiledTemplates[lensTemplateURL] = compiledTemplate;
    var fError = function (statusText, status, xmlhttp) {
        SimileAjax.Debug.log("Failed to load view template from " + lensTemplateURL + "\n" + statusText);
    };
    var fDone = function (xmlhttp) {
        try {
            compiledTemplate.template = Exhibit.Lens.compileTemplate(xmlhttp.responseXML.documentElement, true, job.uiContext);
            compiledTemplate.compiled = true;
            for (var i = 0;
                 i < compiledTemplate.jobs.length;
                 i++) {
                try {
                    var job2 = compiledTemplate.jobs[i];
                    job2.template = compiledTemplate;
                    Exhibit.Lens._performConstructFromLensTemplateJob(job2);
                } catch (e) {
                    SimileAjax.Debug.exception(e, "Lens: Error constructing lens template in job queue");
                }
            }
            compiledTemplate.jobs = null;
        } catch (e) {
            SimileAjax.Debug.exception(e, "Lens: Error compiling lens template and processing template job queue");
        }
    };
    SimileAjax.XmlHttp.get(lensTemplateURL, fError, fDone);
    return compiledTemplate;
};
Exhibit.Lens.compileTemplate = function (rootNode, isXML, uiContext) {
    return Exhibit.Lens._processTemplateNode(rootNode, isXML, uiContext);
};
Exhibit.Lens._processTemplateNode = function (node, isXML, uiContext) {
    if (node.nodeType == 1) {
        return Exhibit.Lens._processTemplateElement(node, isXML, uiContext);
    } else {
        return node.nodeValue || "";
    }
};
Exhibit.Lens._processTemplateElement = function (elmt, isXML, uiContext) {
    var templateNode = {tag: elmt.tagName.toLowerCase() || "span", uiContext: uiContext, control: null, condition: null, content: null, contentAttributes: null, subcontentAttributes: null, attributes: [], styles: [], handlers: [], children: null};
    var settings = {parseChildTextNodes: true};
    var attributes = elmt.attributes;
    for (var i = 0;
         i < attributes.length;
         i++) {
        var attribute = attributes[i];
        var name = attribute.nodeName;
        var value = attribute.nodeValue;
        Exhibit.Lens._processTemplateAttribute(uiContext, templateNode, settings, name, value);
    }
    if (!isXML && SimileAjax.Platform.browser.isIE) {
        var handlers = Exhibit.Lens._handlers;
        for (var h = 0;
             h < handlers.length;
             h++) {
            var handler = handlers[h];
            var code = elmt[handler];
            if (code != null) {
                templateNode.handlers.push({name: handler, code: code});
            }
        }
    }
    var childNode = elmt.firstChild;
    if (childNode != null) {
        templateNode.children = [];
        while (childNode != null) {
            if ((settings.parseChildTextNodes && childNode.nodeType == 3) || childNode.nodeType == 1) {
                templateNode.children.push(Exhibit.Lens._processTemplateNode(childNode, isXML, templateNode.uiContext));
            }
            childNode = childNode.nextSibling;
        }
    }
    return templateNode;
};
Exhibit.Lens._processTemplateAttribute = function (uiContext, templateNode, settings, name, value) {
    if (value == null || typeof value != "string" || value.length == 0 || name == "contentEditable") {
        return;
    }
    if (name.length > 3 && name.substr(0, 3) == "ex:") {
        name = name.substr(3);
        if (name == "formats") {
            templateNode.uiContext = Exhibit.UIContext._createWithParent(uiContext);
            Exhibit.FormatParser.parseSeveral(templateNode.uiContext, value, 0, {});
        } else {
            if (name == "onshow") {
                templateNode.attributes.push({name: name, value: value});
            } else {
                if (name == "control") {
                    templateNode.control = value;
                } else {
                    if (name == "content") {
                        templateNode.content = Exhibit.ExpressionParser.parse(value);
                        templateNode.attributes.push({name: "ex:content", value: value});
                    } else {
                        if (name == "editor") {
                            templateNode.attributes.push({name: "ex:editor", value: value});
                        } else {
                            if (name == "edit") {
                                templateNode.edit = value;
                            } else {
                                if (name == "options") {
                                    templateNode.options = value;
                                } else {
                                    if (name == "editvalues") {
                                        templateNode.editValues = value;
                                    } else {
                                        if (name == "tag") {
                                            templateNode.tag = value;
                                        } else {
                                            if (name == "if-exists") {
                                                templateNode.condition = {test: "if-exists", expression: Exhibit.ExpressionParser.parse(value)};
                                            } else {
                                                if (name == "if") {
                                                    templateNode.condition = {test: "if", expression: Exhibit.ExpressionParser.parse(value)};
                                                    settings.parseChildTextNodes = false;
                                                } else {
                                                    if (name == "select") {
                                                        templateNode.condition = {test: "select", expression: Exhibit.ExpressionParser.parse(value)};
                                                    } else {
                                                        if (name == "case") {
                                                            templateNode.condition = {test: "case", value: value};
                                                            settings.parseChildTextNodes = false;
                                                        } else {
                                                            var isStyle = false;
                                                            var x = name.indexOf("-style-content");
                                                            if (x > 0) {
                                                                isStyle = true;
                                                            } else {
                                                                x = name.indexOf("-content");
                                                            }
                                                            if (x > 0) {
                                                                if (templateNode.contentAttributes == null) {
                                                                    templateNode.contentAttributes = [];
                                                                }
                                                                templateNode.contentAttributes.push({name: name.substr(0, x), expression: Exhibit.ExpressionParser.parse(value), isStyle: isStyle, isSingle: name.substr(0, x) in {href: 1, src: 1}});
                                                            } else {
                                                                x = name.indexOf("-style-subcontent");
                                                                if (x > 0) {
                                                                    isStyle = true;
                                                                } else {
                                                                    x = name.indexOf("-subcontent");
                                                                }
                                                                if (x > 0) {
                                                                    if (templateNode.subcontentAttributes == null) {
                                                                        templateNode.subcontentAttributes = [];
                                                                    }
                                                                    templateNode.subcontentAttributes.push({name: name.substr(0, x), fragments: Exhibit.Lens._parseSubcontentAttribute(value), isStyle: isStyle});
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        if (name == "style") {
            Exhibit.Lens._processStyle(templateNode, value);
        } else {
            if (name != "id") {
                if (name == "class") {
                    if (SimileAjax.Platform.browser.isIE && SimileAjax.Platform.browser.majorVersion < 8) {
                        name = "className";
                    }
                } else {
                    if (name == "cellspacing") {
                        name = "cellSpacing";
                    } else {
                        if (name == "cellpadding") {
                            name = "cellPadding";
                        } else {
                            if (name == "bgcolor") {
                                name = "bgColor";
                            }
                        }
                    }
                }
                templateNode.attributes.push({name: name, value: value});
            }
        }
    }
};
Exhibit.Lens._processStyle = function (templateNode, styleValue) {
    var styles = styleValue.split(";");
    for (var s = 0;
         s < styles.length;
         s++) {
        var pair = styles[s].split(":");
        if (pair.length > 1) {
            var n = pair[0].trim();
            var v = pair[1].trim();
            if (n == "float") {
                n = SimileAjax.Platform.browser.isIE ? "styleFloat" : "cssFloat";
            } else {
                if (n == "-moz-opacity") {
                    n = "MozOpacity";
                } else {
                    if (n.indexOf("-") > 0) {
                        var segments = n.split("-");
                        n = segments[0];
                        for (var x = 1;
                             x < segments.length;
                             x++) {
                            n += segments[x].substr(0, 1).toUpperCase() + segments[x].substr(1);
                        }
                    }
                }
            }
            templateNode.styles.push({name: n, value: v});
        }
    }
};
Exhibit.Lens._parseSubcontentAttribute = function (value) {
    var fragments = [];
    var current = 0;
    var open;
    while (current < value.length && (open = value.indexOf("{{", current)) >= 0) {
        var close = value.indexOf("}}", open);
        if (close < 0) {
            break;
        }
        fragments.push(value.substring(current, open));
        fragments.push(Exhibit.ExpressionParser.parse(value.substring(open + 2, close)));
        current = close + 2;
    }
    if (current < value.length) {
        fragments.push(value.substr(current));
    }
    return fragments;
};
Exhibit.Lens.constructFromLensTemplate = function (itemID, templateNode, parentElmt, uiContext, opts) {
    return Exhibit.Lens._performConstructFromLensTemplateJob({itemID: itemID, template: {template: templateNode}, div: parentElmt, uiContext: uiContext, opts: opts});
};
Exhibit.Lens._performConstructFromLensTemplateJob = function (job) {
    Exhibit.Lens._constructFromLensTemplateNode({"value": job.itemID}, {"value": "item"}, job.template.template, job.div, job.opts);
    var node = job.div.tagName.toLowerCase() == "table" ? job.div.rows[job.div.rows.length - 1] : job.div.lastChild;
    SimileAjax.jQuery(node).show();
    node.setAttribute("ex:itemID", job.itemID);
    if (!Exhibit.params.safe) {
        var onshow = Exhibit.getAttribute(node, "onshow");
        if (onshow != null && onshow.length > 0) {
            try {
                (new Function(onshow)).call(node);
            } catch (e) {
                SimileAjax.Debug.log(e);
            }
        }
    }
    return node;
};
Exhibit.Lens._constructFromLensTemplateNode = function (roots, rootValueTypes, templateNode, parentElmt, opts) {
    if (typeof templateNode == "string") {
        parentElmt.appendChild(document.createTextNode(templateNode));
        return;
    }
    var uiContext = templateNode.uiContext;
    var database = uiContext.getDatabase();
    var children = templateNode.children;

    function processChildren() {
        if (children != null) {
            for (var i = 0;
                 i < children.length;
                 i++) {
                Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[i], elmt, opts);
            }
        }
    }

    if (templateNode.condition != null) {
        if (templateNode.condition.test == "if-exists") {
            if (!templateNode.condition.expression.testExists(roots, rootValueTypes, "value", database)) {
                return;
            }
        } else {
            if (templateNode.condition.test == "if") {
                if (templateNode.condition.expression.evaluate(roots, rootValueTypes, "value", database).values.contains(true)) {
                    if (children != null && children.length > 0) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[0], parentElmt, opts);
                    }
                } else {
                    if (children != null && children.length > 1) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[1], parentElmt, opts);
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
                                    Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, childTemplateNode, parentElmt, opts);
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
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, lastChildTemplateNode, parentElmt, opts);
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
            var value = attribute.isSingle ? values[0] || "" : values.join(";");
            if (attribute.isStyle) {
                elmt.style[attribute.name] = value;
            } else {
                if ("class" == attribute.name) {
                    elmt.className = value;
                } else {
                    if (Exhibit.Lens._attributeValueIsSafe(attribute.name, value)) {
                        elmt.setAttribute(attribute.name, value);
                    }
                }
            }
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
            if (attribute.isStyle) {
                elmt.style[attribute.name] = results;
            } else {
                if ("class" == attribute.name) {
                    elmt.className = results;
                } else {
                    if (Exhibit.Lens._attributeValueIsSafe(attribute.name, results)) {
                        elmt.setAttribute(attribute.name, results);
                    }
                }
            }
        }
    }
    if (!Exhibit.params.safe) {
        var handlers = templateNode.handlers;
        for (var h = 0;
             h < handlers.length;
             h++) {
            var handler = handlers[h];
            elmt[handler.name] = handler.code;
        }
    }
    var itemID = roots["value"];
    if (templateNode.control != null) {
        switch (templateNode.control) {
            case"item-link":
                var a = document.createElement("a");
                a.innerHTML = Exhibit.l10n.itemLinkLabel;
                a.href = Exhibit.Persistence.getItemLink(itemID);
                a.target = "_blank";
                elmt.appendChild(a);
                break;
            case"remove-item":
                if (!opts.disableEditWidgets && database.isNewItem(itemID)) {
                    if (templateNode.tag == "a") {
                        elmt.href = "javascript:";
                    }
                    SimileAjax.jQuery(elmt).click(function () {
                        database.removeItem(itemID);
                    });
                    processChildren();
                } else {
                    parentElmt.removeChild(elmt);
                }
                break;
            case"start-editing":
                if (templateNode.tag == "a") {
                    elmt.href = "javascript:";
                }
                if (opts.disableEditWidgets) {
                    parentElmt.removeChild(elmt);
                } else {
                    if (opts.inPopup) {
                        SimileAjax.jQuery(elmt).click(function () {
                            Exhibit.UI.showItemInPopup(itemID, null, uiContext, {lensType: "edit", coords: opts.coords});
                        });
                        processChildren();
                    } else {
                        SimileAjax.jQuery(elmt).click(function () {
                            uiContext.setEditMode(itemID, true);
                            uiContext.getCollection()._listeners.fire("onItemsChanged", []);
                        });
                        processChildren();
                    }
                }
                break;
            case"stop-editing":
                if (templateNode.tag == "a") {
                    elmt.href = "javascript:";
                }
                if (opts.disableEditWidgets) {
                    parentElmt.removeChild(elmt);
                } else {
                    if (opts.inPopup) {
                        SimileAjax.jQuery(elmt).click(function () {
                            Exhibit.UI.showItemInPopup(itemID, null, uiContext, {lensType: "normal", coords: opts.coords});
                        });
                        processChildren();
                    } else {
                        SimileAjax.jQuery(elmt).click(function () {
                            uiContext.setEditMode(itemID, false);
                            uiContext.getCollection()._listeners.fire("onItemsChanged", []);
                        });
                        processChildren();
                    }
                }
                break;
            case"accept-changes":
                if (database.isSubmission(itemID)) {
                    if (templateNode.tag == "a") {
                        elmt.href = "javascript:";
                    }
                    SimileAjax.jQuery(elmt).click(function () {
                        database.mergeSubmissionIntoItem(itemID);
                    });
                    processChildren();
                } else {
                    SimileAjax.Debug.warn("accept-changes element in non-submission item");
                    parentElmt.removeChild(elmt);
                }
                break;
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
                        Exhibit.Lens._constructFromLensTemplateNode(roots2, rootValueTypes2, children[i], elmt, opts);
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
                Exhibit.Lens._constructDefaultValueList(results.values, results.valueType, elmt, templateNode.uiContext);
            }
        } else {
            if (templateNode.edit != null) {
                processChildren();
                Exhibit.Lens._constructEditableContent(templateNode, elmt, itemID, uiContext);
            } else {
                if (children != null) {
                    for (var i = 0;
                         i < children.length;
                         i++) {
                        Exhibit.Lens._constructFromLensTemplateNode(roots, rootValueTypes, children[i], elmt, opts);
                    }
                }
            }
        }
    }
};
Exhibit.Lens._constructElmtWithAttributes = function (templateNode, parentElmt, database) {
    var elmt;
    if (templateNode.tag == "input" && SimileAjax.Platform.browser.isIE) {
        var a = ["<input"];
        var attributes = templateNode.attributes;
        for (var i = 0;
             i < attributes.length;
             i++) {
            var attribute = attributes[i];
            if (Exhibit.Lens._attributeValueIsSafe(attribute.name, attribute.value)) {
                a.push(attribute.name + '="' + attribute.value + '"');
            }
        }
        a.push("></input>");
        elmt = SimileAjax.DOM.createElementFromString(a.join(" "));
        parentElmt.appendChild(elmt);
    } else {
        switch (templateNode.tag) {
            case"tr":
                elmt = parentElmt.insertRow(parentElmt.rows.length);
                break;
            case"td":
                elmt = parentElmt.insertCell(parentElmt.cells.length);
                break;
            default:
                elmt = document.createElement(templateNode.tag);
                parentElmt.appendChild(elmt);
        }
        var attributes = templateNode.attributes;
        for (var i = 0;
             i < attributes.length;
             i++) {
            var attribute = attributes[i];
            if (Exhibit.Lens._attributeValueIsSafe(attribute.name, attribute.value)) {
                try {
                    elmt.setAttribute(attribute.name, attribute.value);
                } catch (e) {
                }
            }
        }
    }
    var styles = templateNode.styles;
    for (var i = 0;
         i < styles.length;
         i++) {
        var style = styles[i];
        elmt.style[style.name] = style.value;
    }
    return elmt;
};
Exhibit.Lens._constructEditableContent = function (templateNode, elmt, itemID, uiContext) {
    var db = uiContext.getDatabase();
    var attr = templateNode.edit.replace(".", "");
    var itemValue = db.getObject(itemID, attr);
    var changeHandler = function () {
        if (this.value && this.value != itemValue) {
            db.editItem(itemID, attr, this.value);
        }
    };
    if (templateNode.tag == "select") {
        Exhibit.Lens._constructEditableSelect(templateNode, elmt, itemID, uiContext, itemValue);
        SimileAjax.jQuery(elmt).blur(changeHandler);
    } else {
        elmt.value = itemValue;
        SimileAjax.jQuery(elmt).change(changeHandler);
    }
};
Exhibit.Lens.doesSelectContain = function (select, text) {
    for (var i in select.options) {
        var opt = select.options[i];
        if (opt.text == text || opt.value == text) {
            return true;
        }
    }
    return false;
};
Exhibit.Lens._constructEditableSelect = function (templateNode, elmt, itemID, uiContext, itemValue) {
    if (templateNode.options) {
        var expr = Exhibit.ExpressionParser.parse(templateNode.options);
        var allItems = uiContext.getDatabase().getAllItems();
        var results = expr.evaluate({"value": allItems}, {value: "item"}, "value", uiContext.getDatabase());
        var sortedResults = results.values.toArray().sort();
        for (var i in sortedResults) {
            var optText = sortedResults[i];
            if (!Exhibit.Lens.doesSelectContain(elmt, optText)) {
                var newOption = new Option(sortedResults[i], sortedResults[i]);
                elmt.add(newOption, null);
            }
        }
    }
    if (!itemValue) {
        if (!Exhibit.Lens.doesSelectContain(elmt, "")) {
            var newOption = new Option("", "", true);
            elmt.add(newOption, elmt.options[0]);
        }
    } else {
        for (var i in elmt.options) {
            if (elmt.options.hasOwnProperty(i) && elmt.options[i].value == itemValue) {
                elmt.selectedIndex = i;
            }
        }
    }
};
Exhibit.Lens._constructDefaultValueList = function (values, valueType, parentElmt, uiContext) {
    uiContext.formatList(values, values.size(), valueType, function (elmt) {
        parentElmt.appendChild(elmt);
    });
};
Exhibit.Lens._attributeValueIsSafe = function (name, value) {
    if (Exhibit.params.safe) {
        if ((name == "href" && value.startsWith("javascript:")) || (name.startsWith("on"))) {
            return false;
        }
    }
    return true;
};


/* ui-context.js */
Exhibit.UIContext = function () {
    this._parent = null;
    this._exhibit = null;
    this._collection = null;
    this._lensRegistry = new Exhibit.LensRegistry();
    this._settings = {};
    this._formatters = {};
    this._listFormatter = null;
    this._editModeRegistry = {};
    this._popupFunc = null;
};
Exhibit.UIContext.createRootContext = function (configuration, exhibit) {
    var context = new Exhibit.UIContext();
    context._exhibit = exhibit;
    var settings = Exhibit.UIContext.l10n.initialSettings;
    for (var n in settings) {
        context._settings[n] = settings[n];
    }
    var formats = Exhibit.getAttribute(document.body, "formats");
    if (formats != null && formats.length > 0) {
        Exhibit.FormatParser.parseSeveral(context, formats, 0, {});
    }
    Exhibit.SettingsUtilities.collectSettingsFromDOM(document.body, Exhibit.UIContext._settingSpecs, context._settings);
    Exhibit.UIContext._configure(context, configuration);
    return context;
};
Exhibit.UIContext.create = function (configuration, parentUIContext, ignoreLenses) {
    var context = Exhibit.UIContext._createWithParent(parentUIContext);
    Exhibit.UIContext._configure(context, configuration, ignoreLenses);
    return context;
};
Exhibit.UIContext.createFromDOM = function (configElmt, parentUIContext, ignoreLenses) {
    var context = Exhibit.UIContext._createWithParent(parentUIContext);
    if (!(ignoreLenses)) {
        Exhibit.UIContext.registerLensesFromDOM(configElmt, context.getLensRegistry());
    }
    var id = Exhibit.getAttribute(configElmt, "collectionID");
    if (id != null && id.length > 0) {
        context._collection = context._exhibit.getCollection(id);
    }
    var formats = Exhibit.getAttribute(configElmt, "formats");
    if (formats != null && formats.length > 0) {
        Exhibit.FormatParser.parseSeveral(context, formats, 0, {});
    }
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.UIContext._settingSpecs, context._settings);
    Exhibit.UIContext._configure(context, Exhibit.getConfigurationFromDOM(configElmt), ignoreLenses);
    return context;
};
Exhibit.UIContext.prototype.dispose = function () {
};
Exhibit.UIContext.prototype.getParentUIContext = function () {
    return this._parent;
};
Exhibit.UIContext.prototype.getExhibit = function () {
    return this._exhibit;
};
Exhibit.UIContext.prototype.getDatabase = function () {
    return this.getExhibit().getDatabase();
};
Exhibit.UIContext.prototype.getCollection = function () {
    if (this._collection == null) {
        if (this._parent != null) {
            this._collection = this._parent.getCollection();
        } else {
            this._collection = this._exhibit.getDefaultCollection();
        }
    }
    return this._collection;
};
Exhibit.UIContext.prototype.getLensRegistry = function () {
    return this._lensRegistry;
};
Exhibit.UIContext.prototype.getSetting = function (name) {
    return name in this._settings ? this._settings[name] : (this._parent != null ? this._parent.getSetting(name) : undefined);
};
Exhibit.UIContext.prototype.getBooleanSetting = function (name, defaultValue) {
    var v = this.getSetting(name);
    return v == undefined || v == null ? defaultValue : v;
};
Exhibit.UIContext.prototype.putSetting = function (name, value) {
    this._settings[name] = value;
};
Exhibit.UIContext.prototype.format = function (value, valueType, appender) {
    var f;
    if (valueType in this._formatters) {
        f = this._formatters[valueType];
    } else {
        f = this._formatters[valueType] = new Exhibit.Formatter._constructors[valueType](this);
    }
    f.format(value, appender);
};
Exhibit.UIContext.prototype.formatList = function (iterator, count, valueType, appender) {
    if (this._listFormatter == null) {
        this._listFormatter = new Exhibit.Formatter._ListFormatter(this);
    }
    this._listFormatter.formatList(iterator, count, valueType, appender);
};
Exhibit.UIContext.prototype.setEditMode = function (itemID, val) {
    if (val) {
        this._editModeRegistry[itemID] = true;
    } else {
        this._editModeRegistry[itemID] = false;
    }
};
Exhibit.UIContext.prototype.isBeingEdited = function (itemID) {
    return !!this._editModeRegistry[itemID];
};
Exhibit.UIContext._createWithParent = function (parent) {
    var context = new Exhibit.UIContext();
    context._parent = parent;
    context._exhibit = parent._exhibit;
    context._lensRegistry = new Exhibit.LensRegistry(parent.getLensRegistry());
    context._editModeRegistry = parent._editModeRegistry;
    return context;
};
Exhibit.UIContext._settingSpecs = {"bubbleWidth": {type: "int"}, "bubbleHeight": {type: "int"}};
Exhibit.UIContext._configure = function (context, configuration, ignoreLenses) {
    Exhibit.UIContext.registerLenses(configuration, context.getLensRegistry());
    if ("collectionID" in configuration) {
        context._collection = context._exhibit.getCollection(configuration["collectionID"]);
    }
    if ("formats" in configuration) {
        Exhibit.FormatParser.parseSeveral(context, configuration.formats, 0, {});
    }
    if (!(ignoreLenses)) {
        Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.UIContext._settingSpecs, context._settings);
    }
};
Exhibit.UIContext.registerLens = function (configuration, lensRegistry) {
    var template = configuration.templateFile;
    if (template != null) {
        if ("itemTypes" in configuration) {
            for (var i = 0;
                 i < configuration.itemTypes.length;
                 i++) {
                lensRegistry.registerLensForType(template, configuration.itemTypes[i]);
            }
        } else {
            lensRegistry.registerDefaultLens(template);
        }
    }
};
Exhibit.UIContext.registerLensFromDOM = function (elmt, lensRegistry) {
    elmt.style.display = "none";
    var itemTypes = Exhibit.getAttribute(elmt, "itemTypes", ",");
    var template = null;
    var url = Exhibit.getAttribute(elmt, "templateFile");
    if (url != null && url.length > 0) {
        template = url;
    } else {
        var id = Exhibit.getAttribute(elmt, "template");
        var elmt2 = id && document.getElementById(id);
        if (elmt2 != null) {
            template = elmt2;
        } else {
            template = elmt;
        }
    }
    if (template != null) {
        if (itemTypes == null || itemTypes.length == 0 || (itemTypes.length == 1 && itemTypes[0] == "")) {
            lensRegistry.registerDefaultLens(template);
        } else {
            for (var i = 0;
                 i < itemTypes.length;
                 i++) {
                lensRegistry.registerLensForType(template, itemTypes[i]);
            }
        }
    }
};
Exhibit.UIContext.registerLenses = function (configuration, lensRegistry) {
    if ("lenses" in configuration) {
        for (var i = 0;
             i < configuration.lenses.length;
             i++) {
            Exhibit.UIContext.registerLens(configuration.lenses[i], lensRegistry);
        }
    }
    if ("lensSelector" in configuration) {
        var lensSelector = configuration.lensSelector;
        if (typeof lensSelector == "function") {
            lensRegistry.addLensSelector(lensSelector);
        } else {
            SimileAjax.Debug.log("lensSelector is not a function");
        }
    }
};
Exhibit.UIContext.registerLensesFromDOM = function (parentNode, lensRegistry) {
    var node = parentNode.firstChild;
    while (node != null) {
        if (node.nodeType == 1) {
            var role = Exhibit.getRoleAttribute(node);
            if (role == "lens" || role == "edit-lens") {
                Exhibit.UIContext.registerLensFromDOM(node, lensRegistry);
            }
        }
        node = node.nextSibling;
    }
    var lensSelectorString = Exhibit.getAttribute(parentNode, "lensSelector");
    if (lensSelectorString != null && lensSelectorString.length > 0) {
        try {
            var lensSelector = eval(lensSelectorString);
            if (typeof lensSelector == "function") {
                lensRegistry.addLensSelector(lensSelector);
            } else {
                SimileAjax.Debug.log("lensSelector expression " + lensSelectorString + " is not a function");
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Bad lensSelector expression: " + lensSelectorString);
        }
    }
};
Exhibit.UIContext.createLensRegistry = function (configuration, parentLensRegistry) {
    var lensRegistry = new Exhibit.LensRegistry(parentLensRegistry);
    Exhibit.UIContext.registerLenses(configuration, lensRegistry);
    return lensRegistry;
};
Exhibit.UIContext.createLensRegistryFromDOM = function (parentNode, configuration, parentLensRegistry) {
    var lensRegistry = new Exhibit.LensRegistry(parentLensRegistry);
    Exhibit.UIContext.registerLensesFromDOM(parentNode, lensRegistry);
    Exhibit.UIContext.registerLenses(configuration, lensRegistry);
    return lensRegistry;
};


/* ui.js */
Exhibit.UI = new Object();
Exhibit.UI.componentMap = {};
Exhibit.UI.registerComponent = function (name, comp) {
    var msg = "Cannot register component " + name + " -- ";
    if (name in Exhibit.UI.componentMap) {
        SimileAjax.Debug.warn(msg + "another component has taken that name");
    } else {
        if (!comp) {
            SimileAjax.Debug.warn(msg + "no component object provided");
        } else {
            if (!comp.create) {
                SimileAjax.Debug.warn(msg + "component has no create function");
            } else {
                if (!comp.createFromDOM) {
                    SimileAjax.Debug.warn(msg + "component has no createFromDOM function");
                } else {
                    Exhibit.UI.componentMap[name] = comp;
                }
            }
        }
    }
};
Exhibit.UI.create = function (configuration, elmt, uiContext) {
    if ("role" in configuration) {
        var role = configuration.role;
        if (role != null && role.startsWith("exhibit-")) {
            role = role.substr("exhibit-".length);
        }
        if (role in Exhibit.UI.componentMap) {
            var createFunc = Exhibit.UI.componentMap[role].create;
            return createFunc(configuration, elmt, uiContext);
        }
        switch (role) {
            case"lens":
            case"edit-lens":
                Exhibit.UIContext.registerLens(configuration, uiContext.getLensRegistry());
                return null;
            case"view":
                return Exhibit.UI.createView(configuration, elmt, uiContext);
            case"facet":
                return Exhibit.UI.createFacet(configuration, elmt, uiContext);
            case"coordinator":
                return Exhibit.UI.createCoordinator(configuration, uiContext);
            case"coder":
                return Exhibit.UI.createCoder(configuration, uiContext);
            case"viewPanel":
                return Exhibit.ViewPanel.create(configuration, elmt, uiContext);
            case"logo":
                return Exhibit.Logo.create(configuration, elmt, uiContext);
            case"hiddenContent":
                elmt.style.display = "none";
                return null;
        }
    }
    return null;
};
Exhibit.UI.createFromDOM = function (elmt, uiContext) {
    var role = Exhibit.getRoleAttribute(elmt);
    if (role in Exhibit.UI.componentMap) {
        var createFromDOMFunc = Exhibit.UI.componentMap[role].createFromDOM;
        return createFromDOMFunc(elmt, uiContext);
    }
    switch (role) {
        case"lens":
        case"edit-lens":
            Exhibit.UIContext.registerLensFromDOM(elmt, uiContext.getLensRegistry());
            return null;
        case"view":
            return Exhibit.UI.createViewFromDOM(elmt, null, uiContext);
        case"facet":
            return Exhibit.UI.createFacetFromDOM(elmt, null, uiContext);
        case"coordinator":
            return Exhibit.UI.createCoordinatorFromDOM(elmt, uiContext);
        case"coder":
            return Exhibit.UI.createCoderFromDOM(elmt, uiContext);
        case"viewPanel":
            return Exhibit.ViewPanel.createFromDOM(elmt, uiContext);
        case"logo":
            return Exhibit.Logo.createFromDOM(elmt, uiContext);
        case"hiddenContent":
            elmt.style.display = "none";
            return null;
    }
    return null;
};
Exhibit.UI.generateCreationMethods = function (constructor) {
    constructor.create = function (configuration, elmt, uiContext) {
        var newContext = Exhibit.UIContext.create(configuration, uiContext);
        var settings = {};
        Exhibit.SettingsUtilities.collectSettings(configuration, constructor._settingSpecs || {}, settings);
        return new constructor(elmt, newContext, settings);
    };
    constructor.createFromDOM = function (elmt, uiContext) {
        var newContext = Exhibit.UIContext.createFromDOM(elmt, uiContext);
        var settings = {};
        Exhibit.SettingsUtilities.collectSettingsFromDOM(elmt, constructor._settingSpecs || {}, settings);
        return new constructor(elmt, newContext, settings);
    };
};
Exhibit.UI.createView = function (configuration, elmt, uiContext) {
    var viewClass = "viewClass" in configuration ? configuration.viewClass : Exhibit.TileView;
    if (typeof viewClass == "string") {
        viewClass = Exhibit.UI.viewClassNameToViewClass(viewClass);
    }
    return viewClass.create(configuration, elmt, uiContext);
};
Exhibit.UI.createViewFromDOM = function (elmt, container, uiContext) {
    var viewClass = Exhibit.UI.viewClassNameToViewClass(Exhibit.getAttribute(elmt, "viewClass"));
    return viewClass.createFromDOM(elmt, container, uiContext);
};
Exhibit.UI.viewClassNameToViewClass = function (name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "View");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown viewClass " + name);
        }
    }
    return Exhibit.TileView;
};
Exhibit.UI.createFacet = function (configuration, elmt, uiContext) {
    var facetClass = "facetClass" in configuration ? configuration.facetClass : Exhibit.ListFacet;
    if (typeof facetClass == "string") {
        facetClass = Exhibit.UI.facetClassNameToFacetClass(facetClass);
    }
    return facetClass.create(configuration, elmt, uiContext);
};
Exhibit.UI.createFacetFromDOM = function (elmt, container, uiContext) {
    var facetClass = Exhibit.UI.facetClassNameToFacetClass(Exhibit.getAttribute(elmt, "facetClass"));
    return facetClass.createFromDOM(elmt, container, uiContext);
};
Exhibit.UI.facetClassNameToFacetClass = function (name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "Facet");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown facetClass " + name);
        }
    }
    return Exhibit.ListFacet;
};
Exhibit.UI.createCoder = function (configuration, uiContext) {
    var coderClass = "coderClass" in configuration ? configuration.coderClass : Exhibit.ColorCoder;
    if (typeof coderClass == "string") {
        coderClass = Exhibit.UI.coderClassNameToCoderClass(coderClass);
    }
    return coderClass.create(configuration, uiContext);
};
Exhibit.UI.createCoderFromDOM = function (elmt, uiContext) {
    var coderClass = Exhibit.UI.coderClassNameToCoderClass(Exhibit.getAttribute(elmt, "coderClass"));
    return coderClass.createFromDOM(elmt, uiContext);
};
Exhibit.UI.coderClassNameToCoderClass = function (name) {
    if (name != null && name.length > 0) {
        try {
            return Exhibit.UI._stringToObject(name, "Coder");
        } catch (e) {
            SimileAjax.Debug.warn("Unknown coderClass " + name);
        }
    }
    return Exhibit.ColorCoder;
};
Exhibit.UI.createCoordinator = function (configuration, uiContext) {
    return Exhibit.Coordinator.create(configuration, uiContext);
};
Exhibit.UI.createCoordinatorFromDOM = function (elmt, uiContext) {
    return Exhibit.Coordinator.createFromDOM(elmt, uiContext);
};
Exhibit.UI._stringToObject = function (name, suffix) {
    if (!name.startsWith("Exhibit.")) {
        if (!name.endsWith(suffix)) {
            try {
                return eval("Exhibit." + name + suffix);
            } catch (e) {
            }
        }
        try {
            return eval("Exhibit." + name);
        } catch (e) {
        }
    }
    if (!name.endsWith(suffix)) {
        try {
            return eval(name + suffix);
        } catch (e) {
        }
    }
    try {
        return eval(name);
    } catch (e) {
    }
    throw new Error("Unknown class " + name);
};
Exhibit.UI.docRoot = "http://service.simile-widgets.org/wiki/";
Exhibit.UI.validator = "http://service.simile-widgets.org/babel/validator";
Exhibit.UI.showHelp = function (message, url, target) {
    target = (target) ? target : "_blank";
    if (url != null) {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showDocumentationMessage)) {
            window.open(url, target);
        }
    } else {
        window.alert(message);
    }
};
Exhibit.UI.showJavascriptExpressionValidation = function (message, expression) {
    var target = "_blank";
    if (window.confirm(message + "\n\n" + Exhibit.l10n.showJavascriptValidationMessage)) {
        window.open(Exhibit.UI.validator + "?expresson=" + encodeURIComponent(expression), target);
    }
};
Exhibit.UI.showJsonFileValidation = function (message, url) {
    var target = "_blank";
    if (url.indexOf("file:") == 0) {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showJsonValidationFormMessage)) {
            window.open(Exhibit.UI.validator, target);
        }
    } else {
        if (window.confirm(message + "\n\n" + Exhibit.l10n.showJsonValidationMessage)) {
            window.open(Exhibit.UI.validator + "?url=" + url, target);
        }
    }
};
Exhibit.UI._busyIndicator = null;
Exhibit.UI._busyIndicatorCount = 0;
Exhibit.UI.showBusyIndicator = function () {
    Exhibit.UI._busyIndicatorCount++;
    if (Exhibit.UI._busyIndicatorCount > 1) {
        return;
    }
    if (Exhibit.UI._busyIndicator == null) {
        Exhibit.UI._busyIndicator = Exhibit.UI.createBusyIndicator();
    }
    var scrollTop = ("scrollTop" in document.body) ? document.body.scrollTop : document.body.parentNode.scrollTop;
    var height = ("innerHeight" in window) ? window.innerHeight : ("clientHeight" in document.body ? document.body.clientHeight : document.body.parentNode.clientHeight);
    var top = Math.floor(scrollTop + height / 3);
    Exhibit.UI._busyIndicator.style.top = top + "px";
    document.body.appendChild(Exhibit.UI._busyIndicator);
};
Exhibit.UI.hideBusyIndicator = function () {
    Exhibit.UI._busyIndicatorCount--;
    if (Exhibit.UI._busyIndicatorCount > 0) {
        return;
    }
    try {
        document.body.removeChild(Exhibit.UI._busyIndicator);
    } catch (e) {
    }
};
Exhibit.UI.protectUI = function (elmt) {
    SimileAjax.DOM.appendClassName(elmt, "exhibit-ui-protection");
};
Exhibit.UI.makeActionLink = function (text, handler, layer) {
    var a = document.createElement("a");
    a.href = "javascript:";
    a.className = "exhibit-action";
    a.innerHTML = text;
    var handler2 = function (elmt, evt, target) {
        if ("true" != elmt.getAttribute("disabled")) {
            handler(elmt, evt, target);
        }
    };
    SimileAjax.WindowManager.registerEvent(a, "click", handler2, layer);
    return a;
};
Exhibit.UI.enableActionLink = function (a, enabled) {
    a.setAttribute("disabled", enabled ? "false" : "true");
    a.className = enabled ? "exhibit-action" : "exhibit-action-disabled";
};
Exhibit.UI.makeItemSpan = function (itemID, label, uiContext, layer) {
    if (label == null) {
        label = database.getObject(itemID, "label");
        if (label == null) {
            label = itemID;
        }
    }
    var a = SimileAjax.DOM.createElementFromString('<a href="' + Exhibit.Persistence.getItemLink(itemID) + "\" class='exhibit-item'>" + label + "</a>");
    var handler = function (elmt, evt, target) {
        Exhibit.UI.showItemInPopup(itemID, elmt, uiContext);
    };
    SimileAjax.WindowManager.registerEvent(a, "click", handler, layer);
    return a;
};
Exhibit.UI.makeValueSpan = function (label, valueType, layer) {
    var span = document.createElement("span");
    span.className = "exhibit-value";
    if (valueType == "url") {
        var url = label;
        if (Exhibit.params.safe && url.trim().startsWith("javascript:")) {
            span.appendChild(document.createTextNode(url));
        } else {
            span.innerHTML = '<a href="' + url + "\" target='_blank'>" + (label.length > 50 ? label.substr(0, 20) + " ... " + label.substr(label.length - 20) : label) + "</a>";
        }
    } else {
        if (Exhibit.params.safe) {
            label = Exhibit.Formatter.encodeAngleBrackets(label);
        }
        span.innerHTML = label;
    }
    return span;
};
Exhibit.UI.calculatePopupPosition = function (elmt) {
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    return{x: coords.left + Math.round(elmt.offsetWidth / 2), y: coords.top + Math.round(elmt.offsetHeight / 2)};
};
Exhibit.UI.showItemInPopup = function (itemID, elmt, uiContext, opts) {
    SimileAjax.WindowManager.popAllLayers();
    opts = opts || {};
    opts.coords = opts.coords || Exhibit.UI.calculatePopupPosition(elmt);
    var itemLensDiv = document.createElement("div");
    var lensOpts = {inPopup: true, coords: opts.coords};
    if (opts.lensType == "normal") {
        lensOpts.lensTemplate = uiContext.getLensRegistry().getNormalLens(itemID, uiContext);
    } else {
        if (opts.lensType == "edit") {
            lensOpts.lensTemplate = uiContext.getLensRegistry().getEditLens(itemID, uiContext);
        } else {
            if (opts.lensType) {
                SimileAjax.Debug.warn("Unknown Exhibit.UI.showItemInPopup opts.lensType: " + opts.lensType);
            }
        }
    }
    uiContext.getLensRegistry().createLens(itemID, itemLensDiv, uiContext, lensOpts);
    SimileAjax.Graphics.createBubbleForContentAndPoint(itemLensDiv, opts.coords.x, opts.coords.y, uiContext.getSetting("bubbleWidth"));
};
Exhibit.UI.createButton = function (name, handler, className) {
    var button = document.createElement("button");
    button.className = (className || "exhibit-button") + " screen";
    button.innerHTML = name;
    if (handler) {
        SimileAjax.WindowManager.registerEvent(button, "click", handler);
    }
    return button;
};
Exhibit.UI.createPopupMenuDom = function (element) {
    var div = document.createElement("div");
    div.className = "exhibit-menu-popup exhibit-ui-protection";
    var dom = {elmt: div, close: function () {
        document.body.removeChild(this.elmt);
    }, open: function () {
        var self = this;
        this.layer = SimileAjax.WindowManager.pushLayer(function () {
            self.close();
        }, true, div);
        var docWidth = document.body.offsetWidth;
        var docHeight = document.body.offsetHeight;
        var coords = SimileAjax.DOM.getPageCoordinates(element);
        div.style.top = (coords.top + element.scrollHeight) + "px";
        div.style.right = (docWidth - (coords.left + element.scrollWidth)) + "px";
        document.body.appendChild(this.elmt);
    }, appendMenuItem: function (label, icon, onClick) {
        var self = this;
        var a = document.createElement("a");
        a.className = "exhibit-menu-item";
        a.href = "javascript:";
        SimileAjax.WindowManager.registerEvent(a, "click", function (elmt, evt, target) {
            onClick(elmt, evt, target);
            SimileAjax.WindowManager.popLayer(self.layer);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        });
        var div = document.createElement("div");
        a.appendChild(div);
        div.appendChild(SimileAjax.Graphics.createTranslucentImage(icon != null ? icon : (Exhibit.urlPrefix + "images/blank-16x16.png")));
        div.appendChild(document.createTextNode(label));
        this.elmt.appendChild(a);
    }, appendSeparator: function () {
        var hr = document.createElement("hr");
        this.elmt.appendChild(hr);
    }};
    return dom;
};
Exhibit.UI.createBusyIndicator = function () {
    var existing = SimileAjax.jQuery(".exhibit-busyIndicator");
    if (existing.length > 0) {
        var node = existing.eq(0);
        node.detach();
        node.show();
        return node.get(0);
    }
    var urlPrefix = Exhibit.urlPrefix + "images/";
    var containerDiv = document.createElement("div");
    if (SimileAjax.Graphics.pngIsTranslucent) {
        var topDiv = document.createElement("div");
        topDiv.style.height = "33px";
        topDiv.style.background = "url(" + urlPrefix + "message-bubble/message-top-left.png) top left no-repeat";
        topDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(topDiv);
        var topRightDiv = document.createElement("div");
        topRightDiv.style.height = "33px";
        topRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-top-right.png) top right no-repeat";
        topDiv.appendChild(topRightDiv);
        var middleDiv = document.createElement("div");
        middleDiv.style.background = "url(" + urlPrefix + "message-bubble/message-left.png) top left repeat-y";
        middleDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(middleDiv);
        var middleRightDiv = document.createElement("div");
        middleRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-right.png) top right repeat-y";
        middleRightDiv.style.paddingRight = "44px";
        middleDiv.appendChild(middleRightDiv);
        var contentDiv = document.createElement("div");
        middleRightDiv.appendChild(contentDiv);
        var bottomDiv = document.createElement("div");
        bottomDiv.style.height = "55px";
        bottomDiv.style.background = "url(" + urlPrefix + "message-bubble/message-bottom-left.png) bottom left no-repeat";
        bottomDiv.style.paddingLeft = "44px";
        containerDiv.appendChild(bottomDiv);
        var bottomRightDiv = document.createElement("div");
        bottomRightDiv.style.height = "55px";
        bottomRightDiv.style.background = "url(" + urlPrefix + "message-bubble/message-bottom-right.png) bottom right no-repeat";
        bottomDiv.appendChild(bottomRightDiv);
    } else {
        containerDiv.style.border = "2px solid #7777AA";
        containerDiv.style.padding = "20px";
        containerDiv.style.background = "white";
        SimileAjax.Graphics.setOpacity(containerDiv, 90);
        var contentDiv = document.createElement("div");
        containerDiv.appendChild(contentDiv);
    }
    containerDiv.className = "exhibit-busyIndicator";
    contentDiv.className = "exhibit-busyIndicator-content";
    var img = document.createElement("img");
    img.src = urlPrefix + "progress-running.gif";
    contentDiv.appendChild(img);
    contentDiv.appendChild(document.createTextNode(" " + Exhibit.l10n.busyIndicatorMessage));
    return containerDiv;
};
Exhibit.UI.createFocusDialogBox = function (itemID, exhibit, configuration) {
    var template = {tag: "div", className: "exhibit-focusDialog exhibit-ui-protection", children: [
        {tag: "div", className: "exhibit-focusDialog-viewContainer", field: "viewContainer"},
        {tag: "div", className: "exhibit-focusDialog-controls", children: [
            {tag: "button", field: "closeButton", children: [Exhibit.l10n.focusDialogBoxCloseButtonLabel]}
        ]}
    ]};
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    dom.close = function () {
        document.body.removeChild(dom.elmt);
    };
    dom.open = function () {
        dom.layer = SimileAjax.WindowManager.pushLayer(function () {
            dom.close();
        }, false);
        var lens = new Exhibit.Lens(itemID, dom.viewContainer, exhibit, configuration);
        dom.elmt.style.top = (document.body.scrollTop + 100) + "px";
        document.body.appendChild(dom.elmt);
        SimileAjax.WindowManager.registerEvent(dom.closeButton, "click", function (elmt, evt, target) {
            SimileAjax.WindowManager.popLayer(dom.layer);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }, dom.layer);
    };
    return dom;
};
Exhibit.UI.createTranslucentImage = function (relativeUrl, verticalAlign) {
    return SimileAjax.Graphics.createTranslucentImage(Exhibit.urlPrefix + relativeUrl, verticalAlign);
};
Exhibit.UI.createTranslucentImageHTML = function (relativeUrl, verticalAlign) {
    return SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + relativeUrl, verticalAlign);
};
Exhibit.UI.findAttribute = function (attr, value, parent) {
    var parent = SimileAjax.jQuery(parent || document.body);
    var f = function () {
        var v = this.getAttribute(attr);
        if (value === undefined) {
            return !!v;
        } else {
            if (value instanceof Array) {
                return value.indexOf(v) != -1;
            } else {
                return value.toString() == v;
            }
        }
    };
    return parent.find("*").add(parent).filter(f);
};


/* html-view.js */
Exhibit.HTMLView = function (containerElmt, uiContext, html) {
    this.html = html;
    this.view = this.moveChildNodes(html, containerElmt);
};
Exhibit.HTMLView.create = Exhibit.HTMLView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    return new Exhibit.HTMLView(containerElmt != null ? containerElmt : configElmt, null, configElmt);
};
Exhibit.HTMLView.prototype.dispose = function () {
    this.html = this.moveChildNodes(this.view, this.html);
    this.view = this.html = null;
};
Exhibit.HTMLView.prototype.moveChildNodes = function (src, dst) {
    if (src === dst) {
        return dst;
    }
    var tmp = document.createDocumentFragment();
    while (src.firstChild) {
        tmp.appendChild(src.firstChild);
    }
    dst.appendChild(tmp);
    return dst;
};


/* ordered-view-frame.js */
Exhibit.OrderedViewFrame = function (uiContext) {
    this._uiContext = uiContext;
    this._orders = null;
    this._possibleOrders = null;
    this._settings = {};
};
Exhibit.OrderedViewFrame._settingSpecs = {"showAll": {type: "boolean", defaultValue: false}, "grouped": {type: "boolean", defaultValue: true}, "showDuplicates": {type: "boolean", defaultValue: false}, "abbreviatedCount": {type: "int", defaultValue: 10}, "showHeader": {type: "boolean", defaultValue: true}, "showSummary": {type: "boolean", defaultValue: true}, "showControls": {type: "boolean", defaultValue: true}, "showFooter": {type: "boolean", defaultValue: true}, "paginate": {type: "boolean", defaultValue: false}, "pageSize": {type: "int", defaultValue: 20}, "pageWindow": {type: "int", defaultValue: 2}, "page": {type: "int", defaultValue: 0}, "alwaysShowPagingControls": {type: "boolean", defaultValue: false}, "pagingControlLocations": {type: "enum", defaultValue: "topbottom", choices: ["top", "bottom", "topbottom"]}};
Exhibit.OrderedViewFrame.prototype.configure = function (configuration) {
    if ("orders" in configuration) {
        this._orders = [];
        this._configureOrders(configuration.orders);
    }
    if ("possibleOrders" in configuration) {
        this._possibleOrders = [];
        this._configurePossibleOrders(configuration.possibleOrders);
    }
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);
    this._internalValidate();
};
Exhibit.OrderedViewFrame.prototype.configureFromDOM = function (domConfiguration) {
    var orders = Exhibit.getAttribute(domConfiguration, "orders", ",");
    if (orders != null && orders.length > 0) {
        this._orders = [];
        this._configureOrders(orders);
    }
    var directions = Exhibit.getAttribute(domConfiguration, "directions", ",");
    if (directions != null && directions.length > 0 && this._orders != null) {
        for (var i = 0;
             i < directions.length && i < this._orders.length;
             i++) {
            this._orders[i].ascending = (directions[i].toLowerCase() != "descending");
        }
    }
    var possibleOrders = Exhibit.getAttribute(domConfiguration, "possibleOrders", ",");
    if (possibleOrders != null && possibleOrders.length > 0) {
        this._possibleOrders = [];
        this._configurePossibleOrders(possibleOrders);
    }
    var possibleDirections = Exhibit.getAttribute(domConfiguration, "possibleDirections", ",");
    if (possibleDirections != null && possibleDirections.length > 0 && this._possibleOrders != null) {
        for (var i = 0;
             i < possibleDirections.length && i < this._possibleOrders.length;
             i++) {
            this._possibleOrders[i].ascending = (possibleDirections[i].toLowerCase() != "descending");
        }
    }
    Exhibit.SettingsUtilities.collectSettingsFromDOM(domConfiguration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);
    this._internalValidate();
};
Exhibit.OrderedViewFrame.prototype.dispose = function () {
    if (this._headerDom) {
        this._headerDom.dispose();
        this._headerDom = null;
    }
    if (this._footerDom) {
        this._footerDom.dispose();
        this._footerDom = null;
    }
    this._divHeader = null;
    this._divFooter = null;
    this._uiContext = null;
};
Exhibit.OrderedViewFrame.prototype._internalValidate = function () {
    if (this._orders != null && this._orders.length == 0) {
        this._orders = null;
    }
    if (this._possibleOrders != null && this._possibleOrders.length == 0) {
        this._possibleOrders = null;
    }
    if (this._settings.paginate) {
        this._settings.grouped = false;
    }
};
Exhibit.OrderedViewFrame.prototype._configureOrders = function (orders) {
    for (var i = 0;
         i < orders.length;
         i++) {
        var order = orders[i];
        var expr;
        var ascending = true;
        if (typeof order == "string") {
            expr = order;
        } else {
            if (typeof order == "object") {
                expr = order.expression, ascending = ("ascending" in order) ? (order.ascending) : true;
            } else {
                SimileAjax.Debug.warn("Bad order object " + order);
                continue;
            }
        }
        try {
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (path.getSegmentCount() == 1) {
                    var segment = path.getSegment(0);
                    this._orders.push({property: segment.property, forward: segment.forward, ascending: ascending});
                }
            }
        } catch (e) {
            SimileAjax.Debug.warn("Bad order expression " + expr);
        }
    }
};
Exhibit.OrderedViewFrame.prototype._configurePossibleOrders = function (possibleOrders) {
    for (var i = 0;
         i < possibleOrders.length;
         i++) {
        var order = possibleOrders[i];
        var expr;
        var ascending = true;
        if (typeof order == "string") {
            expr = order;
        } else {
            if (typeof order == "object") {
                expr = order.expression, ascending = ("ascending" in order) ? (order.ascending) : true;
            } else {
                SimileAjax.Debug.warn("Bad possible order object " + order);
                continue;
            }
        }
        try {
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (path.getSegmentCount() == 1) {
                    var segment = path.getSegment(0);
                    this._possibleOrders.push({property: segment.property, forward: segment.forward, ascending: ascending});
                }
            }
        } catch (e) {
            SimileAjax.Debug.warn("Bad possible order expression " + expr);
        }
    }
};
Exhibit.OrderedViewFrame.prototype.initializeUI = function () {
    var self = this;
    if (this._settings.showHeader) {
        this._headerDom = Exhibit.OrderedViewFrame.createHeaderDom(this._uiContext, this._divHeader, this._settings.showSummary, this._settings.showControls, function (elmt, evt, target) {
            self._openSortPopup(elmt, -1);
        }, function (elmt, evt, target) {
            self._toggleGroup();
        }, function (pageIndex) {
            self._gotoPage(pageIndex);
        });
    }
    if (this._settings.showFooter) {
        this._footerDom = Exhibit.OrderedViewFrame.createFooterDom(this._uiContext, this._divFooter, function (elmt, evt, target) {
            self._setShowAll(true);
        }, function (elmt, evt, target) {
            self._setShowAll(false);
        }, function (pageIndex) {
            self._gotoPage(pageIndex);
        });
    }
};
Exhibit.OrderedViewFrame.prototype.reconstruct = function () {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var originalSize = collection.countAllItems();
    var currentSize = collection.countRestrictedItems();
    var hasSomeGrouping = false;
    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        hasSomeGrouping = this._internalReconstruct(currentSet);
        var orderElmts = [];
        var buildOrderElmt = function (order, index) {
            var property = database.getProperty(order.property);
            var label = property != null ? (order.forward ? property.getPluralLabel() : property.getReversePluralLabel()) : (order.forward ? order.property : "reverse of " + order.property);
            orderElmts.push(Exhibit.UI.makeActionLink(label, function (elmt, evt, target) {
                self._openSortPopup(elmt, index);
            }));
        };
        var orders = this._getOrders();
        for (var i = 0;
             i < orders.length;
             i++) {
            buildOrderElmt(orders[i], i);
        }
        if (this._settings.showHeader && this._settings.showControls) {
            this._headerDom.setOrders(orderElmts);
            this._headerDom.enableThenByAction(orderElmts.length < this._getPossibleOrders().length);
        }
    }
    if (this._settings.showHeader && this._settings.showControls) {
        this._headerDom.groupOptionWidget.setChecked(this._settings.grouped);
    }
    if (this._settings.showFooter) {
        this._footerDom.setCounts(currentSize, this._settings.abbreviatedCount, this._settings.showAll, !(hasSomeGrouping && this._grouped) && !this._settings.paginate);
    }
};
Exhibit.OrderedViewFrame.prototype._internalReconstruct = function (allItems) {
    var self = this;
    var settings = this._settings;
    var database = this._uiContext.getDatabase();
    var orders = this._getOrders();
    var itemIndex = 0;
    var hasSomeGrouping = false;
    var createItem = function (itemID) {
        if ((itemIndex >= fromIndex && itemIndex < toIndex) || (hasSomeGrouping && settings.grouped)) {
            self.onNewItem(itemID, itemIndex);
        }
        itemIndex++;
    };
    var createGroup = function (label, valueType, index) {
        if ((itemIndex >= fromIndex && itemIndex < toIndex) || (hasSomeGrouping && settings.grouped)) {
            self.onNewGroup(label, valueType, index);
        }
    };
    var processLevel = function (items, index) {
        var order = orders[index];
        var values = order.forward ? database.getObjectsUnion(items, order.property) : database.getSubjectsUnion(items, order.property);
        var valueType = "text";
        if (order.forward) {
            var property = database.getProperty(order.property);
            valueType = property != null ? property.getValueType() : "text";
        } else {
            valueType = "item";
        }
        var keys = (valueType == "item" || valueType == "text") ? processNonNumericLevel(items, index, values, valueType) : processNumericLevel(items, index, values, valueType);
        var grouped = false;
        for (var k = 0;
             k < keys.length;
             k++) {
            if (keys[k].items.size() > 1) {
                grouped = true;
            }
        }
        if (grouped) {
            hasSomeGrouping = true;
        }
        for (var k = 0;
             k < keys.length;
             k++) {
            var key = keys[k];
            if (key.items.size() > 0) {
                if (grouped && settings.grouped) {
                    createGroup(key.display, valueType, index);
                }
                items.removeSet(key.items);
                if (key.items.size() > 1 && index < orders.length - 1) {
                    processLevel(key.items, index + 1);
                } else {
                    key.items.visit(createItem);
                }
            }
        }
        if (items.size() > 0) {
            if (grouped && settings.grouped) {
                createGroup(Exhibit.l10n.missingSortKey, valueType, index);
            }
            if (items.size() > 1 && index < orders.length - 1) {
                processLevel(items, index + 1);
            } else {
                items.visit(createItem);
            }
        }
    };
    var processNonNumericLevel = function (items, index, values, valueType) {
        var keys = [];
        var compareKeys;
        var retrieveItems;
        var order = orders[index];
        if (valueType == "item") {
            values.visit(function (itemID) {
                var label = database.getObject(itemID, "label");
                label = label != null ? label : itemID;
                keys.push({itemID: itemID, display: label});
            });
            compareKeys = function (key1, key2) {
                var c = key1.display.localeCompare(key2.display);
                return c != 0 ? c : key1.itemID.localeCompare(key2.itemID);
            };
            retrieveItems = order.forward ? function (key) {
                return database.getSubjects(key.itemID, order.property, null, items);
            } : function (key) {
                return database.getObjects(key.itemID, order.property, null, items);
            };
        } else {
            values.visit(function (value) {
                keys.push({display: value});
            });
            compareKeys = function (key1, key2) {
                return key1.display.localeCompare(key2.display);
            };
            retrieveItems = order.forward ? function (key) {
                return database.getSubjects(key.display, order.property, null, items);
            } : function (key) {
                return database.getObjects(key.display, order.property, null, items);
            };
        }
        keys.sort(function (key1, key2) {
            return(order.ascending ? 1 : -1) * compareKeys(key1, key2);
        });
        for (var k = 0;
             k < keys.length;
             k++) {
            var key = keys[k];
            key.items = retrieveItems(key);
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        return keys;
    };
    var processNumericLevel = function (items, index, values, valueType) {
        var keys = [];
        var keyMap = {};
        var order = orders[index];
        var valueParser;
        if (valueType == "number") {
            valueParser = function (value) {
                if (typeof value == "number") {
                    return value;
                } else {
                    try {
                        return parseFloat(value);
                    } catch (e) {
                        return null;
                    }
                }
            };
        } else {
            valueParser = function (value) {
                if (value instanceof Date) {
                    return value.getTime();
                } else {
                    try {
                        return SimileAjax.DateTime.parseIso8601DateTime(value.toString()).getTime();
                    } catch (e) {
                        return null;
                    }
                }
            };
        }
        values.visit(function (value) {
            var sortkey = valueParser(value);
            if (sortkey != null) {
                var key = keyMap[sortkey];
                if (!key) {
                    key = {sortkey: sortkey, display: value, values: [], items: new Exhibit.Set()};
                    keyMap[sortkey] = key;
                    keys.push(key);
                }
                key.values.push(value);
            }
        });
        keys.sort(function (key1, key2) {
            return(order.ascending ? 1 : -1) * (key1.sortkey - key2.sortkey);
        });
        for (var k = 0;
             k < keys.length;
             k++) {
            var key = keys[k];
            var values = key.values;
            for (var v = 0;
                 v < values.length;
                 v++) {
                if (order.forward) {
                    database.getSubjects(values[v], order.property, key.items, items);
                } else {
                    database.getObjects(values[v], order.property, key.items, items);
                }
            }
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        return keys;
    };
    var totalCount = allItems.size();
    var pageCount = Math.ceil(totalCount / settings.pageSize);
    var fromIndex = 0;
    var toIndex = settings.showAll ? totalCount : Math.min(totalCount, settings.abbreviatedCount);
    if (!settings.grouped && settings.paginate && (pageCount > 1 || (pageCount > 0 && settings.alwaysShowPagingControls))) {
        fromIndex = settings.page * settings.pageSize;
        toIndex = Math.min(fromIndex + settings.pageSize, totalCount);
        if (settings.showHeader && (settings.pagingControlLocations == "top" || settings.pagingControlLocations == "topbottom")) {
            this._headerDom.renderPageLinks(settings.page, pageCount, settings.pageWindow);
        }
        if (settings.showFooter && (settings.pagingControlLocations == "bottom" || settings.pagingControlLocations == "topbottom")) {
            this._footerDom.renderPageLinks(settings.page, pageCount, settings.pageWindow);
        }
    } else {
        if (settings.showHeader) {
            this._headerDom.hidePageLinks();
        }
        if (settings.showFooter) {
            this._footerDom.hidePageLinks();
        }
    }
    processLevel(allItems, 0);
    return hasSomeGrouping;
};
Exhibit.OrderedViewFrame.prototype._getOrders = function () {
    return this._orders || [this._getPossibleOrders()[0]];
};
Exhibit.OrderedViewFrame.prototype._getPossibleOrders = function () {
    var possibleOrders = null;
    if (this._possibleOrders == null) {
        possibleOrders = this._uiContext.getDatabase().getAllProperties();
        for (var i = 0, p;
             p = possibleOrders[i];
             i++) {
            possibleOrders[i] = {ascending: true, forward: true, property: p};
        }
    } else {
        possibleOrders = [].concat(this._possibleOrders);
    }
    if (possibleOrders.length == 0) {
        possibleOrders.push({property: "label", forward: true, ascending: true});
    }
    return possibleOrders;
};
Exhibit.OrderedViewFrame.prototype._openSortPopup = function (elmt, index) {
    var self = this;
    var database = this._uiContext.getDatabase();
    var popupDom = Exhibit.UI.createPopupMenuDom(elmt);
    var configuredOrders = this._getOrders();
    if (index >= 0) {
        var order = configuredOrders[index];
        var property = database.getProperty(order.property);
        var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
        var valueType = order.forward ? property.getValueType() : "item";
        var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
        sortLabels = (sortLabels != null) ? sortLabels : Exhibit.Database.l10n.sortLabels["text"];
        popupDom.appendMenuItem(sortLabels.ascending, Exhibit.urlPrefix + (order.ascending ? "images/option-check.png" : "images/option.png"), order.ascending ? function () {
        } : function () {
            self._reSort(index, order.property, order.forward, true, false);
        });
        popupDom.appendMenuItem(sortLabels.descending, Exhibit.urlPrefix + (order.ascending ? "images/option.png" : "images/option-check.png"), order.ascending ? function () {
            self._reSort(index, order.property, order.forward, false, false);
        } : function () {
        });
        if (configuredOrders.length > 1) {
            popupDom.appendSeparator();
            popupDom.appendMenuItem(Exhibit.OrderedViewFrame.l10n.removeOrderLabel, null, function () {
                self._removeOrder(index);
            });
        }
    }
    var orders = [];
    var possibleOrders = this._getPossibleOrders();
    for (i = 0;
         i < possibleOrders.length;
         i++) {
        var possibleOrder = possibleOrders[i];
        var skip = false;
        for (var j = (index < 0) ? configuredOrders.length - 1 : index;
             j >= 0;
             j--) {
            var existingOrder = configuredOrders[j];
            if (existingOrder.property == possibleOrder.property && existingOrder.forward == possibleOrder.forward) {
                skip = true;
                break;
            }
        }
        if (!skip) {
            var property = database.getProperty(possibleOrder.property);
            orders.push({property: possibleOrder.property, forward: possibleOrder.forward, ascending: possibleOrder.ascending, label: possibleOrder.forward ? property.getPluralLabel() : property.getReversePluralLabel()});
        }
    }
    if (orders.length > 0) {
        if (index >= 0) {
            popupDom.appendSeparator();
        }
        orders.sort(function (order1, order2) {
            return order1.label.localeCompare(order2.label);
        });
        var appendOrder = function (order) {
            popupDom.appendMenuItem(order.label, null, function () {
                self._reSort(index, order.property, order.forward, order.ascending, true);
            });
        };
        for (var i = 0;
             i < orders.length;
             i++) {
            appendOrder(orders[i]);
        }
    }
    popupDom.open();
};
Exhibit.OrderedViewFrame.prototype._reSort = function (index, propertyID, forward, ascending, slice) {
    var oldOrders = this._getOrders();
    index = (index < 0) ? oldOrders.length : index;
    var newOrders = oldOrders.slice(0, index);
    newOrders.push({property: propertyID, forward: forward, ascending: ascending});
    if (!slice) {
        newOrders = newOrders.concat(oldOrders.slice(index + 1));
    }
    var property = this._uiContext.getDatabase().getProperty(propertyID);
    var propertyLabel = forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : Exhibit.Database.l10n.sortLabels["text"];
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        self._orders = newOrders;
        self.parentReconstruct();
    }, function () {
        self._orders = oldOrders;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n.formatSortActionTitle(propertyLabel, ascending ? sortLabels.ascending : sortLabels.descending));
};
Exhibit.OrderedViewFrame.prototype._removeOrder = function (index) {
    var oldOrders = this._getOrders();
    var newOrders = oldOrders.slice(0, index).concat(oldOrders.slice(index + 1));
    var order = oldOrders[index];
    var property = this._uiContext.getDatabase().getProperty(order.property);
    var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = order.forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : Exhibit.Database.l10n.sortLabels["text"];
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        self._orders = newOrders;
        self.parentReconstruct();
    }, function () {
        self._orders = oldOrders;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle(propertyLabel, order.ascending ? sortLabels.ascending : sortLabels.descending));
};
Exhibit.OrderedViewFrame.prototype._setShowAll = function (showAll) {
    var self = this;
    var settings = this._settings;
    SimileAjax.History.addLengthyAction(function () {
        settings.showAll = showAll;
        self.parentReconstruct();
    }, function () {
        settings.showAll = !showAll;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n[showAll ? "showAllActionTitle" : "dontShowAllActionTitle"]);
};
Exhibit.OrderedViewFrame.prototype._toggleGroup = function () {
    var settings = this._settings;
    var oldGrouped = settings.grouped;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        settings.grouped = !oldGrouped;
        self.parentReconstruct();
    }, function () {
        settings.grouped = oldGrouped;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n[oldGrouped ? "ungroupAsSortedActionTitle" : "groupAsSortedActionTitle"]);
};
Exhibit.OrderedViewFrame.prototype._toggleShowDuplicates = function () {
    var settings = this._settings;
    var oldShowDuplicates = settings.showDuplicates;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        settings.showDuplicates = !oldShowDuplicates;
        self.parentReconstruct();
    }, function () {
        settings.showDuplicates = oldShowDuplicates;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n[oldShowDuplicates ? "hideDuplicatesActionTitle" : "showDuplicatesActionTitle"]);
};
Exhibit.OrderedViewFrame.prototype._gotoPage = function (pageIndex) {
    var settings = this._settings;
    var oldPageIndex = settings.page;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        settings.page = pageIndex;
        self.parentReconstruct();
    }, function () {
        settings.page = oldPageIndex;
        self.parentReconstruct();
    }, Exhibit.OrderedViewFrame.l10n.makePagingActionTitle(pageIndex));
};
Exhibit.OrderedViewFrame.headerTemplate = "<div id='collectionSummaryDiv' style='display: none;'></div><div class='exhibit-collectionView-header-sortControls' style='display: none;' id='controlsDiv'>%0<span class='exhibit-collectionView-header-groupControl'> \u2022 <a id='groupOption' class='exhibit-action'></a></span></div>";
Exhibit.OrderedViewFrame.createHeaderDom = function (uiContext, headerDiv, showSummary, showControls, onThenSortBy, onGroupToggle, gotoPage) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    var template = String.substitute(Exhibit.OrderedViewFrame.headerTemplate + "<" + l10n.pagingControlContainerElement + " class='exhibit-collectionView-pagingControls' style='display: none;' id='topPagingDiv'></" + l10n.pagingControlContainerElement + ">", [l10n.sortingControlsTemplate]);
    var dom = SimileAjax.DOM.createDOMFromString(headerDiv, template, {});
    headerDiv.className = "exhibit-collectionView-header";
    if (showSummary) {
        dom.collectionSummaryDiv.style.display = "block";
        dom.collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create({}, dom.collectionSummaryDiv, uiContext);
    }
    if (showControls) {
        dom.controlsDiv.style.display = "block";
        dom.groupOptionWidget = Exhibit.OptionWidget.create({label: l10n.groupedAsSortedOptionLabel, onToggle: onGroupToggle}, dom.groupOption, uiContext);
        SimileAjax.WindowManager.registerEvent(dom.thenSortByAction, "click", onThenSortBy);
        dom.enableThenByAction = function (enabled) {
            Exhibit.UI.enableActionLink(dom.thenSortByAction, enabled);
        };
        dom.setOrders = function (orderElmts) {
            dom.ordersSpan.innerHTML = "";
            var addDelimiter = Exhibit.Formatter.createListDelimiter(dom.ordersSpan, orderElmts.length, uiContext);
            for (var i = 0;
                 i < orderElmts.length;
                 i++) {
                addDelimiter();
                dom.ordersSpan.appendChild(orderElmts[i]);
            }
            addDelimiter();
        };
    }
    dom.renderPageLinks = function (page, totalPage, pageWindow) {
        Exhibit.OrderedViewFrame.renderPageLinks(dom.topPagingDiv, page, totalPage, pageWindow, gotoPage);
        dom.topPagingDiv.style.display = "block";
    };
    dom.hidePageLinks = function () {
        dom.topPagingDiv.style.display = "none";
    };
    dom.dispose = function () {
        if ("collectionSummaryWidget" in dom) {
            dom.collectionSummaryWidget.dispose();
            dom.collectionSummaryWidget = null;
        }
        dom.groupOptionWidget.dispose();
        dom.groupOptionWidget = null;
    };
    return dom;
};
Exhibit.OrderedViewFrame.footerTemplate = "<div id='showAllSpan'></div>";
Exhibit.OrderedViewFrame.createFooterDom = function (uiContext, footerDiv, onShowAll, onDontShowAll, gotoPage) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    var dom = SimileAjax.DOM.createDOMFromString(footerDiv, Exhibit.OrderedViewFrame.footerTemplate + "<" + l10n.pagingControlContainerElement + " class='exhibit-collectionView-pagingControls' style='display: none;' id='bottomPagingDiv'></" + l10n.pagingControlContainerElement + ">", {});
    footerDiv.className = "exhibit-collectionView-footer";
    dom.setCounts = function (count, limitCount, showAll, canToggle) {
        dom.showAllSpan.innerHTML = "";
        if (canToggle && count > limitCount) {
            dom.showAllSpan.style.display = "block";
            if (showAll) {
                dom.showAllSpan.appendChild(Exhibit.UI.makeActionLink(l10n.formatDontShowAll(limitCount), onDontShowAll));
            } else {
                dom.showAllSpan.appendChild(Exhibit.UI.makeActionLink(l10n.formatShowAll(count), onShowAll));
            }
        }
    };
    dom.renderPageLinks = function (page, totalPage, pageWindow) {
        Exhibit.OrderedViewFrame.renderPageLinks(dom.bottomPagingDiv, page, totalPage, pageWindow, gotoPage);
        dom.bottomPagingDiv.style.display = "block";
        dom.showAllSpan.style.display = "none";
    };
    dom.hidePageLinks = function () {
        dom.bottomPagingDiv.style.display = "none";
    };
    dom.dispose = function () {
    };
    return dom;
};
Exhibit.OrderedViewFrame.renderPageLinks = function (parentElmt, page, pageCount, pageWindow, gotoPage) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    parentElmt.className = "exhibit-collectionView-pagingControls";
    parentElmt.innerHTML = "";
    var self = this;
    var renderPageLink = function (label, index) {
        var elmt = document.createElement(l10n.pagingControlElement);
        elmt.className = "exhibit-collectionView-pagingControls-page";
        parentElmt.appendChild(elmt);
        var a = document.createElement("a");
        a.innerHTML = label;
        a.href = "javascript:{}";
        a.title = l10n.makePagingLinkTooltip(index);
        elmt.appendChild(a);
        var handler = function (elmt, evt, target) {
            gotoPage(index);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        SimileAjax.WindowManager.registerEvent(a, "click", handler);
    };
    var renderPageNumber = function (index) {
        if (index == page) {
            var elmt = document.createElement(l10n.pagingControlElement);
            elmt.className = "exhibit-collectionView-pagingControls-currentPage";
            elmt.innerHTML = (index + 1);
            parentElmt.appendChild(elmt);
        } else {
            renderPageLink(index + 1, index);
        }
    };
    var renderHTML = function (html) {
        var elmt = document.createElement(l10n.pagingControlElement);
        elmt.innerHTML = html;
        parentElmt.appendChild(elmt);
    };
    if (page > 0) {
        renderPageLink(l10n.previousPage, page - 1);
        if (l10n.pageSeparator.length > 0) {
            renderHTML(" ");
        }
    }
    var pageWindowStart = 0;
    var pageWindowEnd = pageCount - 1;
    if (page - pageWindow > 1) {
        renderPageNumber(0);
        renderHTML(l10n.pageWindowEllipses);
        pageWindowStart = page - pageWindow;
    }
    if (page + pageWindow < pageCount - 2) {
        pageWindowEnd = page + pageWindow;
    }
    for (var i = pageWindowStart;
         i <= pageWindowEnd;
         i++) {
        if (i > pageWindowStart && l10n.pageSeparator.length > 0) {
            renderHTML(l10n.pageSeparator);
        }
        renderPageNumber(i);
    }
    if (pageWindowEnd < pageCount - 1) {
        renderHTML(l10n.pageWindowEllipses);
        renderPageNumber(pageCount - 1);
    }
    if (page < pageCount - 1) {
        if (l10n.pageSeparator.length > 0) {
            renderHTML(" ");
        }
        renderPageLink(l10n.nextPage, page + 1);
    }
};


/* tabular-view.js */
Exhibit.TabularView = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {rowStyler: null, tableStyler: null, indexMap: {}};
    this._columns = [];
    this._rowTemplate = null;
    var view = this;
    this._listener = {onItemsChanged: function () {
        view._settings.page = 0;
        view._reconstruct();
    }};
    uiContext.getCollection().addListener(this._listener);
};
Exhibit.TabularView._settingSpecs = {"sortAscending": {type: "boolean", defaultValue: true}, "sortColumn": {type: "int", defaultValue: 0}, "showSummary": {type: "boolean", defaultValue: true}, "showToolbox": {type: "boolean", defaultValue: true}, "border": {type: "int", defaultValue: 1}, "cellPadding": {type: "int", defaultValue: 5}, "cellSpacing": {type: "int", defaultValue: 3}, "paginate": {type: "boolean", defaultValue: false}, "pageSize": {type: "int", defaultValue: 20}, "pageWindow": {type: "int", defaultValue: 2}, "page": {type: "int", defaultValue: 0}, "alwaysShowPagingControls": {type: "boolean", defaultValue: false}, "pagingControlLocations": {type: "enum", defaultValue: "topbottom", choices: ["top", "bottom", "topbottom"]}};
Exhibit.TabularView.create = function (configuration, containerElmt, uiContext) {
    var view = new Exhibit.TabularView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.TabularView._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.TabularView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var view = new Exhibit.TabularView(containerElmt != null ? containerElmt : configElmt, uiContext);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TabularView._settingSpecs, view._settings);
    try {
        var expressions = [];
        var labels = Exhibit.getAttribute(configElmt, "columnLabels", ",") || [];
        var s = Exhibit.getAttribute(configElmt, "columns");
        if (s != null && s.length > 0) {
            expressions = Exhibit.ExpressionParser.parseSeveral(s);
        }
        for (var i = 0;
             i < expressions.length;
             i++) {
            var expression = expressions[i];
            view._columns.push({expression: expression, uiContext: Exhibit.UIContext.create({}, view._uiContext, true), styler: null, label: i < labels.length ? labels[i] : null, format: "list"});
        }
        var formats = Exhibit.getAttribute(configElmt, "columnFormats");
        if (formats != null && formats.length > 0) {
            var index = 0;
            var startPosition = 0;
            while (index < view._columns.length && startPosition < formats.length) {
                var column = view._columns[index];
                var o = {};
                column.format = Exhibit.FormatParser.parseSeveral(column.uiContext, formats, startPosition, o);
                startPosition = o.index;
                while (startPosition < formats.length && " \t\r\n".indexOf(formats.charAt(startPosition)) >= 0) {
                    startPosition++;
                }
                if (startPosition < formats.length && formats.charAt(startPosition) == ",") {
                    startPosition++;
                }
                index++;
            }
        }
        var tables = configElmt.getElementsByTagName("table");
        if (tables.length > 0 && tables[0].rows.length > 0) {
            view._rowTemplate = Exhibit.Lens.compileTemplate(tables[0].rows[0], false, uiContext);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "TabularView: Error processing configuration of tabular view");
    }
    var s = Exhibit.getAttribute(configElmt, "rowStyler");
    if (s != null && s.length > 0) {
        var f = eval(s);
        if (typeof f == "function") {
            view._settings.rowStyler = f;
        }
    }
    s = Exhibit.getAttribute(configElmt, "tableStyler");
    if (s != null && s.length > 0) {
        f = eval(s);
        if (typeof f == "function") {
            view._settings.tableStyler = f;
        }
    }
    Exhibit.TabularView._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};
Exhibit.TabularView._configure = function (view, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TabularView._settingSpecs, view._settings);
    if ("columns" in configuration) {
        var columns = configuration.columns;
        for (var i = 0;
             i < columns.length;
             i++) {
            var column = columns[i];
            var expr;
            var styler = null;
            var label = null;
            var format = null;
            if (typeof column == "string") {
                expr = column;
            } else {
                expr = column.expression;
                styler = column.styler;
                label = column.label;
                format = column.format;
            }
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (format != null && format.length > 0) {
                    format = Exhibit.FormatParser.parse(view._uiContext, format, 0);
                } else {
                    format = "list";
                }
                view._columns.push({expression: expression, styler: styler, label: label, format: format, uiContext: view._uiContext});
            }
        }
    }
    if ("rowStyler" in configuration) {
        view._settings.rowStyler = configuration.rowStyler;
    }
    if ("tableStyler" in configuration) {
        view._settings.tableStyler = configuration.tableStyler;
    }
};
Exhibit.TabularView.prototype._internalValidate = function () {
    if (this._columns.length == 0) {
        var database = this._uiContext.getDatabase();
        var propertyIDs = database.getAllProperties();
        for (var i = 0;
             i < propertyIDs.length;
             i++) {
            var propertyID = propertyIDs[i];
            if (propertyID != "uri") {
                this._columns.push({expression: Exhibit.ExpressionParser.parse("." + propertyID), styler: null, label: database.getProperty(propertyID).getLabel(), format: "list"});
            }
        }
    }
    this._settings.sortColumn = Math.max(0, Math.min(this._settings.sortColumn, this._columns.length - 1));
};
Exhibit.TabularView.prototype.dispose = function () {
    this._uiContext.getCollection().removeListener(this._listener);
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    this._collectionSummaryWidget.dispose();
    this._collectionSummaryWidget = null;
    this._uiContext.dispose();
    this._uiContext = null;
    this._div.innerHTML = "";
    this._dom = null;
    this._div = null;
};
Exhibit.TabularView.prototype._initializeUI = function () {
    var self = this;
    this._div.innerHTML = "";
    this._dom = Exhibit.TabularView.createDom(this._div);
    this._collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create({}, this._dom.collectionSummaryDiv, this._uiContext);
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function () {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    if (!this._settings.showSummary) {
        this._dom.collectionSummaryDiv.style.display = "none";
    }
    this._reconstruct();
};
Exhibit.TabularView.prototype._reconstruct = function () {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var bodyDiv = this._dom.bodyDiv;
    bodyDiv.innerHTML = "";
    var items = [];
    var originalSize = collection.countAllItems();
    if (originalSize > 0) {
        var currentSet = collection.getRestrictedItems();
        currentSet.visit(function (itemID) {
            items.push({id: itemID, sortKey: ""});
        });
    }
    if (items.length > 0) {
        var sortColumn = this._columns[this._settings.sortColumn];
        var sorter = this._createSortFunction(items, sortColumn.expression, this._settings.sortAscending);
        items.sort(this._stabilize(sorter, this._settings.indexMap, originalSize + 1));
        for (i = 0;
             i < items.length;
             i++) {
            this._settings.indexMap[items[i].id] = i;
        }
        var table = document.createElement("table");
        table.className = "exhibit-tabularView-body";
        if (this._settings.tableStyler != null) {
            this._settings.tableStyler(table, database);
        } else {
            table.cellSpacing = this._settings.cellSpacing;
            table.cellPadding = this._settings.cellPadding;
            table.border = this._settings.border;
        }
        var tr = table.insertRow(0);
        var createColumnHeader = function (i) {
            var column = self._columns[i];
            if (column.label == null) {
                column.label = self._getColumnLabel(column.expression);
            }
            var td = document.createElement("th");
            Exhibit.TabularView.createColumnHeader(exhibit, td, column.label, i == self._settings.sortColumn, self._settings.sortAscending, function (elmt, evt, target) {
                self._doSort(i);
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            });
            tr.appendChild(td);
        };
        for (var i = 0;
             i < this._columns.length;
             i++) {
            createColumnHeader(i);
        }
        var renderItem;
        if (this._rowTemplate != null) {
            renderItem = function (i) {
                var item = items[i];
                var tr = Exhibit.Lens.constructFromLensTemplate(item.id, self._rowTemplate, table, self._uiContext);
                if (self._settings.rowStyler != null) {
                    self._settings.rowStyler(item.id, database, tr, i);
                }
            };
        } else {
            renderItem = function (i) {
                var item = items[i];
                var tr = table.insertRow(table.rows.length);
                for (var c = 0;
                     c < self._columns.length;
                     c++) {
                    var column = self._columns[c];
                    var td = tr.insertCell(c);
                    var results = column.expression.evaluate({"value": item.id}, {"value": "item"}, "value", database);
                    var valueType = column.format == "list" ? results.valueType : column.format;
                    column.uiContext.formatList(results.values, results.size, valueType, function (elmt) {
                        td.appendChild(elmt);
                    });
                    if (column.styler != null) {
                        column.styler(item.id, database, td);
                    }
                }
                if (self._settings.rowStyler != null) {
                    self._settings.rowStyler(item.id, database, tr, i);
                }
            };
        }
        var start, end;
        var generatePagingControls = false;
        if (this._settings.paginate) {
            start = this._settings.page * this._settings.pageSize;
            end = Math.min(start + this._settings.pageSize, items.length);
            generatePagingControls = (items.length > this._settings.pageSize) || (items.length > 0 && this._settings.alwaysShowPagingControls);
        } else {
            start = 0;
            end = items.length;
        }
        for (var i = start;
             i < end;
             i++) {
            renderItem(i);
        }
        bodyDiv.appendChild(table);
        if (generatePagingControls) {
            if (this._settings.pagingControlLocations == "top" || this._settings.pagingControlLocations == "topbottom") {
                this._renderPagingDiv(this._dom.topPagingDiv, items.length, this._settings.page);
                this._dom.topPagingDiv.style.display = "block";
            }
            if (this._settings.pagingControlLocations == "bottom" || this._settings.pagingControlLocations == "topbottom") {
                this._renderPagingDiv(this._dom.bottomPagingDiv, items.length, this._settings.page);
                this._dom.bottomPagingDiv.style.display = "block";
            }
        } else {
            this._dom.topPagingDiv.style.display = "none";
            this._dom.bottomPagingDiv.style.display = "none";
        }
    }
};
Exhibit.TabularView.prototype._renderPagingDiv = function (parentElmt, itemCount, page) {
    var pageCount = Math.ceil(itemCount / this._settings.pageSize);
    var self = this;
    Exhibit.OrderedViewFrame.renderPageLinks(parentElmt, page, pageCount, this._settings.pageWindow, function (p) {
        self._gotoPage(p);
    });
};
Exhibit.TabularView.prototype._getColumnLabel = function (expression) {
    var database = this._uiContext.getDatabase();
    var path = expression.getPath();
    var segment = path.getSegment(path.getSegmentCount() - 1);
    var propertyID = segment.property;
    var property = database.getProperty(propertyID);
    if (property != null) {
        return segment.forward ? property.getLabel() : property.getReverseLabel();
    } else {
        return propertyID;
    }
};
Exhibit.TabularView.prototype._stabilize = function (f, indexMap) {
    var stable = function (item1, item2) {
        var cmp = f(item1, item2);
        if (cmp) {
            return cmp;
        } else {
            i1 = item1.id in indexMap ? indexMap[item1.id] : -1;
            i2 = item2.id in indexMap ? indexMap[item2.id] : -1;
            return i1 - i2;
        }
    };
    return stable;
};
Exhibit.TabularView.prototype._createSortFunction = function (items, expression, ascending) {
    var database = this._uiContext.getDatabase();
    var multiply = ascending ? 1 : -1;
    var numericFunction = function (item1, item2) {
        var val = multiply * (item1.sortKey - item2.sortKey);
        return isNaN(val) ? 0 : val;
    };
    var textFunction = function (item1, item2) {
        return multiply * item1.sortKey.localeCompare(item2.sortKey);
    };
    var valueTypes = [];
    var valueTypeMap = {};
    for (var i = 0;
         i < items.length;
         i++) {
        var item = items[i];
        var r = expression.evaluate({"value": item.id}, {"value": "item"}, "value", database);
        r.values.visit(function (value) {
            item.sortKey = value;
        });
        if (!(r.valueType in valueTypeMap)) {
            valueTypeMap[r.valueType] = true;
            valueTypes.push(r.valueType);
        }
    }
    var coercedValueType = "text";
    if (valueTypes.length == 1) {
        coercedValueType = valueTypes[0];
    } else {
        coercedValueType = "text";
    }
    var coersion;
    var sortingFunction;
    if (coercedValueType == "number") {
        sortingFunction = numericFunction;
        coersion = function (v) {
            if (v == null) {
                return Number.NEGATIVE_INFINITY;
            } else {
                if (typeof v == "number") {
                    return v;
                } else {
                    var n = parseFloat(v);
                    if (isNaN(n)) {
                        return Number.MAX_VALUE;
                    } else {
                        return n;
                    }
                }
            }
        };
    } else {
        if (coercedValueType == "date") {
            sortingFunction = numericFunction;
            coersion = function (v) {
                if (v == null) {
                    return Number.NEGATIVE_INFINITY;
                } else {
                    if (v instanceof Date) {
                        return v.getTime();
                    } else {
                        try {
                            return SimileAjax.DateTime.parseIso8601DateTime(v).getTime();
                        } catch (e) {
                            return Number.MAX_VALUE;
                        }
                    }
                }
            };
        } else {
            if (coercedValueType == "boolean") {
                sortingFunction = numericFunction;
                coersion = function (v) {
                    if (v == null) {
                        return Number.MAX_VALUE;
                    } else {
                        if (typeof v == "boolean") {
                            return v ? 1 : 0;
                        } else {
                            return v.toString().toLowerCase() == "true";
                        }
                    }
                };
            } else {
                if (coercedValueType == "item") {
                    sortingFunction = textFunction;
                    coersion = function (v) {
                        if (v == null) {
                            return Exhibit.l10n.missingSortKey;
                        } else {
                            var label = database.getObject(v, "label");
                            return(label == null) ? v : label;
                        }
                    };
                } else {
                    sortingFunction = textFunction;
                    coersion = function (v) {
                        if (v == null) {
                            return Exhibit.l10n.missingSortKey;
                        } else {
                            return v.toString();
                        }
                    };
                }
            }
        }
    }
    for (var i = 0;
         i < items.length;
         i++) {
        var item = items[i];
        item.sortKey = coersion(item.sortKey);
    }
    return sortingFunction;
};
Exhibit.TabularView.prototype._doSort = function (columnIndex) {
    var oldSortColumn = this._settings.sortColumn;
    var oldSortAscending = this._settings.sortAscending;
    var newSortColumn = columnIndex;
    var newSortAscending = oldSortColumn == newSortColumn ? !oldSortAscending : true;
    var oldPage = this._settings.page;
    var newPage = 0;
    var settings = this._settings;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        settings.sortColumn = newSortColumn;
        settings.sortAscending = newSortAscending;
        settings.page = newPage;
        self._reconstruct();
    }, function () {
        settings.sortColumn = oldSortColumn;
        settings.sortAscending = oldSortAscending;
        settings.page = oldPage;
        self._reconstruct();
    }, Exhibit.TabularView.l10n.makeSortActionTitle(this._columns[columnIndex].label, newSortAscending));
};
Exhibit.TabularView.prototype._gotoPage = function (page) {
    var oldPage = this._settings.page;
    var newPage = page;
    var settings = this._settings;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        settings.page = newPage;
        self._reconstruct();
    }, function () {
        settings.page = oldPage;
        self._reconstruct();
    }, Exhibit.OrderedViewFrame.l10n.makePagingActionTitle(page));
};
Exhibit.TabularView._constructDefaultValueList = function (values, valueType, parentElmt, uiContext) {
    uiContext.formatList(values, values.size(), valueType, function (elmt) {
        parentElmt.appendChild(elmt);
    });
};
Exhibit.TabularView.createDom = function (div) {
    var l10n = Exhibit.TabularView.l10n;
    var l10n2 = Exhibit.OrderedViewFrame.l10n;
    var headerTemplate = {elmt: div, className: "exhibit-collectionView-header", children: [
        {tag: "div", field: "collectionSummaryDiv"},
        {tag: l10n2.pagingControlContainerElement, className: "exhibit-tabularView-pagingControls", field: "topPagingDiv"},
        {tag: "div", field: "bodyDiv"},
        {tag: l10n2.pagingControlContainerElement, className: "exhibit-tabularView-pagingControls", field: "bottomPagingDiv"}
    ]};
    return SimileAjax.DOM.createDOMFromTemplate(headerTemplate);
};
Exhibit.TabularView.createColumnHeader = function (exhibit, th, label, sort, sortAscending, sortFunction) {
    var l10n = Exhibit.TabularView.l10n;
    var template = {elmt: th, className: sort ? "exhibit-tabularView-columnHeader-sorted" : "exhibit-tabularView-columnHeader", title: sort ? l10n.columnHeaderReSortTooltip : l10n.columnHeaderSortTooltip, children: [label]};
    if (sort) {
        template.children.push({elmt: Exhibit.UI.createTranslucentImage(sortAscending ? "images/up-arrow.png" : "images/down-arrow.png")});
    }
    SimileAjax.WindowManager.registerEvent(th, "click", sortFunction, null);
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    return dom;
};


/* thumbnail-view.js */
Exhibit.ThumbnailView = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    var view = this;
    this._listener = {onItemsChanged: function () {
        view._orderedViewFrame._settings.page = 0;
        view._reconstruct();
    }};
    uiContext.getCollection().addListener(this._listener);
    this._orderedViewFrame = new Exhibit.OrderedViewFrame(uiContext);
    this._orderedViewFrame.parentReconstruct = function () {
        view._reconstruct();
    };
};
Exhibit.ThumbnailView._settingSpecs = {"showToolbox": {type: "boolean", defaultValue: true}, "columnCount": {type: "int", defaultValue: -1}};
Exhibit.ThumbnailView._itemContainerClass = SimileAjax.Platform.browser.isIE ? "exhibit-thumbnailView-itemContainer-IE" : "exhibit-thumbnailView-itemContainer";
Exhibit.ThumbnailView.create = function (configuration, containerElmt, uiContext) {
    var view = new Exhibit.ThumbnailView(containerElmt, Exhibit.UIContext.create(configuration, uiContext, true));
    view._lensRegistry = Exhibit.UIContext.createLensRegistry(configuration, uiContext.getLensRegistry());
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ThumbnailView._settingSpecs, view._settings);
    view._orderedViewFrame.configure(configuration);
    view._initializeUI();
    return view;
};
Exhibit.ThumbnailView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.ThumbnailView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext, true));
    view._lensRegistry = Exhibit.UIContext.createLensRegistryFromDOM(configElmt, configuration, uiContext.getLensRegistry());
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ThumbnailView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ThumbnailView._settingSpecs, view._settings);
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    view._initializeUI();
    return view;
};
Exhibit.ThumbnailView.prototype.dispose = function () {
    this._uiContext.getCollection().removeListener(this._listener);
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    this._orderedViewFrame.dispose();
    this._orderedViewFrame = null;
    this._lensRegistry = null;
    this._dom = null;
    this._div.innerHTML = "";
    this._div = null;
    this._uiContext = null;
};
Exhibit.ThumbnailView.prototype._initializeUI = function () {
    var self = this;
    this._div.innerHTML = "";
    var template = {elmt: this._div, children: [
        {tag: "div", field: "headerDiv"},
        {tag: "div", className: "exhibit-collectionView-body", field: "bodyDiv"},
        {tag: "div", field: "footerDiv"}
    ]};
    this._dom = SimileAjax.DOM.createDOMFromTemplate(template);
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function () {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    this._orderedViewFrame._divHeader = this._dom.headerDiv;
    this._orderedViewFrame._divFooter = this._dom.footerDiv;
    this._orderedViewFrame._generatedContentElmtRetriever = function () {
        return self._dom.bodyDiv;
    };
    this._orderedViewFrame.initializeUI();
    this._reconstruct();
};
Exhibit.ThumbnailView.prototype._reconstruct = function () {
    if (this._settings.columnCount < 2) {
        this._reconstructWithFloats();
    } else {
        this._reconstructWithTable();
    }
};
Exhibit.ThumbnailView.prototype._reconstructWithFloats = function () {
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
        itemLensDiv.className = Exhibit.ThumbnailView._itemContainerClass;
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext);
        state.itemContainer.appendChild(itemLensDiv);
    };
    this._div.style.display = "none";
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    this._div.style.display = "block";
};
Exhibit.ThumbnailView.prototype._reconstructWithTable = function () {
    var view = this;
    var state = {div: this._dom.bodyDiv, groupDoms: [], groupCounts: [], table: null, columnIndex: 0};
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
        state.table = null;
        state.columnIndex = 0;
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
        if (state.columnIndex >= view._settings.columnCount) {
            state.columnIndex = 0;
        }
        if (state.table == null) {
            state.table = Exhibit.ThumbnailView.constructTableItemContainer();
            state.div.appendChild(state.table);
        }
        if (state.columnIndex == 0) {
            state.table.insertRow(state.table.rows.length);
        }
        var td = state.table.rows[state.table.rows.length - 1].insertCell(state.columnIndex++);
        for (var i = 0;
             i < state.groupCounts.length;
             i++) {
            state.groupCounts[i]++;
        }
        var itemLensDiv = document.createElement("div");
        itemLensDiv.className = Exhibit.ThumbnailView._itemContainerClass;
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext);
        td.appendChild(itemLensDiv);
    };
    this._div.style.display = "none";
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    this._div.style.display = "block";
};
Exhibit.ThumbnailView.constructGroup = function (groupLevel, label) {
    var l10n = Exhibit.ThumbnailView.l10n;
    var template = {tag: "div", className: "exhibit-thumbnailView-group", children: [
        {tag: "h" + (groupLevel + 1), children: [label, {tag: "span", className: "exhibit-collectionView-group-count", children: [" (", {tag: "span", field: "countSpan"}, ")"]}], field: "header"},
        {tag: "div", className: "exhibit-collectionView-group-content", field: "contentDiv"}
    ]};
    return SimileAjax.DOM.createDOMFromTemplate(template);
};
Exhibit.ThumbnailView.constructItemContainer = function () {
    var div = document.createElement("div");
    div.className = "exhibit-thumbnailView-body";
    return div;
};
Exhibit.ThumbnailView.constructTableItemContainer = function () {
    var table = document.createElement("table");
    table.className = "exhibit-thumbnailView-body";
    return table;
};


/* tile-view.js */
Exhibit.TileView = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    var view = this;
    this._listener = {onItemsChanged: function () {
        view._orderedViewFrame._settings.page = 0;
        view._reconstruct();
    }};
    uiContext.getCollection().addListener(this._listener);
    this._orderedViewFrame = new Exhibit.OrderedViewFrame(uiContext);
    this._orderedViewFrame.parentReconstruct = function () {
        view._reconstruct();
    };
};
Exhibit.TileView._settingSpecs = {"showToolbox": {type: "boolean", defaultValue: true}};
Exhibit.TileView.create = function (configuration, containerElmt, uiContext) {
    var view = new Exhibit.TileView(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TileView._settingSpecs, view._settings);
    view._orderedViewFrame.configure(configuration);
    view._initializeUI();
    return view;
};
Exhibit.TileView.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.TileView(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TileView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TileView._settingSpecs, view._settings);
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    view._initializeUI();
    return view;
};
Exhibit.TileView.prototype.dispose = function () {
    this._uiContext.getCollection().removeListener(this._listener);
    this._div.innerHTML = "";
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    this._orderedViewFrame.dispose();
    this._orderedViewFrame = null;
    this._dom = null;
    this._div = null;
    this._uiContext = null;
};
Exhibit.TileView.prototype._initializeUI = function () {
    var self = this;
    this._div.innerHTML = "";
    var template = {elmt: this._div, children: [
        {tag: "div", field: "headerDiv"},
        {tag: "div", className: "exhibit-collectionView-body", field: "bodyDiv"},
        {tag: "div", field: "footerDiv"}
    ]};
    this._dom = SimileAjax.DOM.createDOMFromTemplate(template);
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function () {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    this._orderedViewFrame._divHeader = this._dom.headerDiv;
    this._orderedViewFrame._divFooter = this._dom.footerDiv;
    this._orderedViewFrame._generatedContentElmtRetriever = function () {
        return self._dom.bodyDiv;
    };
    this._orderedViewFrame.initializeUI();
    this._reconstruct();
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
        var itemLens = view._uiContext.getLensRegistry().createLens(itemID, itemLensItem, view._uiContext);
        state.contents.appendChild(itemLensItem);
    };
    this._div.style.display = "none";
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    this._div.style.display = "block";
};
Exhibit.TileView.constructGroup = function (groupLevel, label) {
    var template = {tag: "div", className: "exhibit-collectionView-group", children: [
        {tag: "h" + (groupLevel + 1), children: [label, {tag: "span", className: "exhibit-collectionView-group-count", children: [" (", {tag: "span", field: "countSpan"}, ")"]}], field: "header"},
        {tag: "div", className: "exhibit-collectionView-group-content", field: "contentDiv"}
    ]};
    return SimileAjax.DOM.createDOMFromTemplate(template);
};
Exhibit.TileView.constructList = function () {
    var div = document.createElement("ol");
    div.className = "exhibit-tileView-body";
    return div;
};


/* view-panel.js */
Exhibit.ViewPanel = function (div, uiContext) {
    this._uiContext = uiContext;
    this._div = div;
    this._uiContextCache = {};
    this._viewConstructors = [];
    this._viewConfigs = [];
    this._viewLabels = [];
    this._viewTooltips = [];
    this._viewDomConfigs = [];
    this._viewIDs = [];
    this._viewClassStrings = [];
    this._viewIndex = 0;
    this._view = null;
};
Exhibit.ViewPanel.create = function (configuration, div, uiContext) {
    var viewPanel = new Exhibit.ViewPanel(div, uiContext);
    if ("views" in configuration) {
        for (var i = 0;
             i < configuration.views.length;
             i++) {
            var viewConfig = configuration.views[i];
            var viewClass = ("viewClass" in view) ? view.viewClass : Exhibit.TileView;
            if (typeof viewClass == "string") {
                viewClass = Exhibit.UI.viewClassNameToViewClass(viewClass);
            }
            var label = null;
            if ("viewLabel" in viewConfig) {
                label = viewConfig.viewLabel;
            } else {
                if ("label" in viewConfig) {
                    label = viewConfig.label;
                } else {
                    if ("l10n" in viewClass && "viewLabel" in viewClass.l10n) {
                        label = viewClass.l10n.viewLabel;
                    } else {
                        label = "" + viewClass;
                    }
                }
            }
            var tooltip = null;
            if ("tooltip" in viewConfig) {
                tooltip = viewConfig.tooltip;
            } else {
                if ("l10n" in viewClass && "viewTooltip" in viewClass.l10n) {
                    tooltip = viewClass.l10n.viewTooltip;
                } else {
                    tooltip = label;
                }
            }
            var id = viewPanel._generateViewID();
            if ("id" in viewConfig) {
                id = viewConfig.id;
            }
            viewPanel._viewConstructors.push(viewClass);
            viewPanel._viewConfigs.push(viewConfig);
            viewPanel._viewLabels.push(label);
            viewPanel._viewTooltips.push(tooltip);
            viewPanel._viewDomConfigs.push(null);
            viewPanel._viewIDs.push(id);
        }
    }
    if ("initialView" in configuration) {
        viewPanel._viewIndex = configuration.initialView;
    }
    viewPanel._internalValidate();
    viewPanel._initializeUI();
    return viewPanel;
};
Exhibit.ViewPanel.createFromDOM = function (div, uiContext) {
    var viewPanel = new Exhibit.ViewPanel(div, Exhibit.UIContext.createFromDOM(div, uiContext, false));
    var node = div.firstChild;
    while (node != null) {
        if (node.nodeType == 1) {
            node.style.display = "none";
            var role = Exhibit.getRoleAttribute(node);
            if (role == "view") {
                var viewClass = Exhibit.TileView;
                var viewClassString = Exhibit.getAttribute(node, "viewClass");
                if (viewClassString != null && viewClassString.length > 0) {
                    viewClass = Exhibit.UI.viewClassNameToViewClass(viewClassString);
                    if (viewClass == null) {
                        SimileAjax.Debug.warn("Unknown viewClass " + viewClassString);
                    }
                }
                var viewLabel = Exhibit.getAttribute(node, "viewLabel");
                var label = (viewLabel != null && viewLabel.length > 0) ? viewLabel : Exhibit.getAttribute(node, "label");
                var tooltip = Exhibit.getAttribute(node, "title");
                var id = node.id;
                if (label == null) {
                    if ("viewLabel" in viewClass.l10n) {
                        label = viewClass.l10n.viewLabel;
                    } else {
                        label = "" + viewClass;
                    }
                }
                if (tooltip == null) {
                    if ("l10n" in viewClass && "viewTooltip" in viewClass.l10n) {
                        tooltip = viewClass.l10n.viewTooltip;
                    } else {
                        tooltip = label;
                    }
                }
                if (id == null || id.length == 0) {
                    id = viewPanel._generateViewID();
                }
                viewPanel._viewConstructors.push(viewClass);
                viewPanel._viewConfigs.push(null);
                viewPanel._viewLabels.push(label);
                viewPanel._viewTooltips.push(tooltip);
                viewPanel._viewDomConfigs.push(node);
                viewPanel._viewIDs.push(id);
                viewPanel._viewClassStrings.push(viewClassString);
            }
        }
        node = node.nextSibling;
    }
    var initialView = Exhibit.getAttribute(div, "initialView");
    if (initialView != null && initialView.length > 0) {
        try {
            var n = parseInt(initialView);
            if (!isNaN(n)) {
                viewPanel._viewIndex = n;
            }
        } catch (e) {
        }
    }
    viewPanel._internalValidate();
    viewPanel._initializeUI();
    return viewPanel;
};
Exhibit.ViewPanel.prototype.dispose = function () {
    this._uiContext.getCollection().removeListener(this._listener);
    if (this._view != null) {
        this._view.dispose();
        this._view = null;
    }
    this._div.innerHTML = "";
    this._uiContext.dispose();
    this._uiContext = null;
    this._div = null;
};
Exhibit.ViewPanel.prototype._generateViewID = function () {
    return"view" + Math.floor(Math.random() * 1000000).toString();
};
Exhibit.ViewPanel.prototype._internalValidate = function () {
    if (this._viewConstructors.length == 0) {
        this._viewConstructors.push(Exhibit.TileView);
        this._viewConfigs.push({});
        this._viewLabels.push(Exhibit.TileView.l10n.viewLabel);
        this._viewTooltips.push(Exhibit.TileView.l10n.viewTooltip);
        this._viewDomConfigs.push(null);
        this._viewIDs.push(this._generateViewID());
    }
    this._viewIndex = Math.max(0, Math.min(this._viewIndex, this._viewConstructors.length - 1));
};
Exhibit.ViewPanel.prototype._initializeUI = function () {
    var div = document.createElement("div");
    if (this._div.firstChild != null) {
        this._div.insertBefore(div, this._div.firstChild);
    } else {
        this._div.appendChild(div);
    }
    var self = this;
    this._dom = Exhibit.ViewPanel.constructDom(this._div.firstChild, this._viewLabels, this._viewTooltips, function (index) {
        self._selectView(index);
    });
    this._createView();
};
Exhibit.ViewPanel.prototype._createView = function () {
    var viewContainer = this._dom.getViewContainer();
    viewContainer.innerHTML = "";
    var viewDiv = document.createElement("div");
    viewContainer.appendChild(viewDiv);
    var index = this._viewIndex;
    var context = this._uiContextCache[index] || this._uiContext;
    try {
        if (this._viewDomConfigs[index] != null) {
            this._view = this._viewConstructors[index].createFromDOM(this._viewDomConfigs[index], viewContainer, context);
        } else {
            this._view = this._viewConstructors[index].create(this._viewConfigs[index], viewContainer, context);
        }
    } catch (e) {
        SimileAjax.Debug.log("Failed to create view " + this._viewLabels[index]);
        SimileAjax.Debug.exception(e);
    }
    this._uiContextCache[index] = this._view._uiContext;
    this._uiContext.getExhibit().setComponent(this._viewIDs[index], this._view);
    this._dom.setViewIndex(index);
};
Exhibit.ViewPanel.prototype._switchView = function (newIndex) {
    if (this._view) {
        this._uiContext.getExhibit().disposeComponent(this._viewIDs[this._viewIndex]);
        this._view = null;
    }
    this._viewIndex = newIndex;
    this._createView();
};
Exhibit.ViewPanel.prototype._selectView = function (newIndex) {
    var oldIndex = this._viewIndex;
    var self = this;
    SimileAjax.History.addLengthyAction(function () {
        self._switchView(newIndex);
    }, function () {
        self._switchView(oldIndex);
    }, Exhibit.ViewPanel.l10n.createSelectViewActionTitle(self._viewLabels[newIndex]));
    if (SimileAjax.RemoteLog.logActive) {
        var dat = {"action": "switchView", "oldIndex": oldIndex, "newIndex": newIndex, "oldLabel": this._viewLabels[oldIndex], "newLabel": this._viewLabels[newIndex], "oldID": this._viewIDs[oldIndex], "newID": this._viewIDs[newIndex]};
        if (newIndex < this._viewClassStrings.length) {
            dat["newClass"] = this._viewClassStrings[newIndex];
        }
        if (oldIndex < this._viewClassStrings.length) {
            dat["oldClass"] = this._viewClassStrings[oldIndex];
        }
        SimileAjax.RemoteLog.possiblyLog(dat);
    }
};
Exhibit.ViewPanel.getPropertyValuesPairs = function (itemID, propertyEntries, database) {
    var pairs = [];
    var enterPair = function (propertyID, forward) {
        var property = database.getProperty(propertyID);
        var values = forward ? database.getObjects(itemID, propertyID) : database.getSubjects(itemID, propertyID);
        var count = values.size();
        if (count > 0) {
            var itemValues = property.getValueType() == "item";
            var pair = {propertyLabel: forward ? (count > 1 ? property.getPluralLabel() : property.getLabel()) : (count > 1 ? property.getReversePluralLabel() : property.getReverseLabel()), valueType: property.getValueType(), values: []};
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
Exhibit.ViewPanel.constructDom = function (div, viewLabels, viewTooltips, onSelectView) {
    var l10n = Exhibit.ViewPanel.l10n;
    var template = {elmt: div, className: "exhibit-viewPanel exhibit-ui-protection", children: [
        {tag: "div", className: "exhibit-viewPanel-viewSelection", field: "viewSelectionDiv"},
        {tag: "div", className: "exhibit-viewPanel-viewContainer", field: "viewContainerDiv"}
    ]};
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    dom.getViewContainer = function () {
        return dom.viewContainerDiv;
    };
    dom.setViewIndex = function (index) {
        if (viewLabels.length > 1) {
            dom.viewSelectionDiv.innerHTML = "";
            var appendView = function (i) {
                var selected = (i == index);
                if (i > 0) {
                    dom.viewSelectionDiv.appendChild(document.createTextNode(" \u2022 "));
                }
                var span = document.createElement("span");
                span.className = selected ? "exhibit-viewPanel-viewSelection-selectedView" : "exhibit-viewPanel-viewSelection-view";
                span.title = viewTooltips[i];
                span.innerHTML = viewLabels[i];
                if (!selected) {
                    var handler = function (elmt, evt, target) {
                        onSelectView(i);
                        SimileAjax.DOM.cancelEvent(evt);
                        return false;
                    };
                    SimileAjax.WindowManager.registerEvent(span, "click", handler);
                }
                dom.viewSelectionDiv.appendChild(span);
            };
            for (var i = 0;
                 i < viewLabels.length;
                 i++) {
                appendView(i);
            }
        }
    };
    return dom;
};


/* collection-summary-widget.js */
Exhibit.CollectionSummaryWidget = function (containerElmt, uiContext) {
    this._exhibit = uiContext.getExhibit();
    this._collection = uiContext.getCollection();
    this._uiContext = uiContext;
    this._div = containerElmt;
    var widget = this;
    this._listener = {onItemsChanged: function () {
        widget._reconstruct();
    }};
    this._collection.addListener(this._listener);
};
Exhibit.CollectionSummaryWidget.create = function (configuration, containerElmt, uiContext) {
    var widget = new Exhibit.CollectionSummaryWidget(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    widget._initializeUI();
    return widget;
};
Exhibit.CollectionSummaryWidget.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var widget = new Exhibit.CollectionSummaryWidget(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    widget._initializeUI();
    return widget;
};
Exhibit.CollectionSummaryWidget.prototype.dispose = function () {
    this._collection.removeListener(this._listener);
    this._div.innerHTML = "";
    this._noResultsDom = null;
    this._allResultsDom = null;
    this._filteredResultsDom = null;
    this._div = null;
    this._collection = null;
    this._exhibit = null;
};
Exhibit.CollectionSummaryWidget.prototype._initializeUI = function () {
    var self = this;
    var l10n = Exhibit.CollectionSummaryWidget.l10n;
    var onClearFilters = function (elmt, evt, target) {
        self._resetCollection();
        SimileAjax.DOM.cancelEvent(evt);
        return false;
    };
    this._allResultsDom = SimileAjax.DOM.createDOMFromString("span", String.substitute(l10n.allResultsTemplate, ["exhibit-collectionSummaryWidget-results"]));
    this._filteredResultsDom = SimileAjax.DOM.createDOMFromString("span", String.substitute(l10n.filteredResultsTemplate, ["exhibit-collectionSummaryWidget-results"]), {resetActionLink: Exhibit.UI.makeActionLink(l10n.resetFiltersLabel, onClearFilters)});
    this._noResultsDom = SimileAjax.DOM.createDOMFromString("span", String.substitute(l10n.noResultsTemplate, ["exhibit-collectionSummaryWidget-results", "exhibit-collectionSummaryWidget-count"]), {resetActionLink: Exhibit.UI.makeActionLink(l10n.resetFiltersLabel, onClearFilters)});
    this._div.innerHTML = "";
    this._reconstruct();
};
Exhibit.CollectionSummaryWidget.prototype._reconstruct = function () {
    var originalSize = this._collection.countAllItems();
    var currentSize = this._collection.countRestrictedItems();
    var database = this._uiContext.getDatabase();
    var dom = this._dom;
    while (this._div.childNodes.length > 0) {
        this._div.removeChild(this._div.firstChild);
    }
    if (originalSize > 0) {
        if (currentSize == 0) {
            this._div.appendChild(this._noResultsDom.elmt);
        } else {
            var typeIDs = database.getTypeIDs(this._collection.getRestrictedItems()).toArray();
            var typeID = typeIDs.length == 1 ? typeIDs[0] : "Item";
            var description = Exhibit.Database.l10n.labelItemsOfType(currentSize, typeID, database, "exhibit-collectionSummaryWidget-count");
            if (currentSize == originalSize) {
                this._div.appendChild(this._allResultsDom.elmt);
                this._allResultsDom.resultDescription.innerHTML = "";
                this._allResultsDom.resultDescription.appendChild(description);
            } else {
                this._div.appendChild(this._filteredResultsDom.elmt);
                this._filteredResultsDom.resultDescription.innerHTML = "";
                this._filteredResultsDom.resultDescription.appendChild(description);
                this._filteredResultsDom.originalCountSpan.innerHTML = originalSize;
            }
        }
    }
};
Exhibit.CollectionSummaryWidget.prototype._resetCollection = function () {
    var state = {};
    var collection = this._collection;
    SimileAjax.History.addLengthyAction(function () {
        state.restrictions = collection.clearAllRestrictions();
    }, function () {
        collection.applyRestrictions(state.restrictions);
    }, Exhibit.CollectionSummaryWidget.l10n.resetActionTitle);
};


/* legend-gradient-widget.js */
Exhibit.LegendGradientWidget = function (containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._initializeUI();
};
Exhibit.LegendGradientWidget.create = function (containerElmt, uiContext) {
    return new Exhibit.LegendGradientWidget(containerElmt, uiContext);
};
Exhibit.LegendGradientWidget.prototype.addGradient = function (configuration) {
    var gradientPoints = [];
    var gradientPoints = configuration;
    var sortObj = function (a, b) {
        return a.value - b.value;
    };
    gradientPoints.sort(sortObj);
    var theTable = document.createElement("table");
    var tableBody = document.createElement("tbody");
    var theRow1 = document.createElement("tr");
    var theRow2 = document.createElement("tr");
    var theRow3 = document.createElement("tr");
    theRow1.style.height = "2em";
    theRow2.style.height = "2em";
    theRow3.style.height = "2em";
    theTable.style.width = "80%";
    theTable.cellSpacing = "0";
    theTable.style.emptyCells = "show";
    theTable.style.marginLeft = "auto";
    theTable.style.marginRight = "auto";
    tableBody.appendChild(theRow1);
    tableBody.appendChild(theRow2);
    tableBody.appendChild(theRow3);
    theTable.appendChild(tableBody);
    this._theRow1 = theRow1;
    this._theRow2 = theRow2;
    this._theRow3 = theRow3;
    var globLowPoint = gradientPoints[0].value;
    var globHighPoint = gradientPoints[gradientPoints.length - 1].value;
    var stepSize = (globHighPoint - globLowPoint) / 50;
    var counter = 0;
    for (var i = 0;
         i < gradientPoints.length - 1;
         i++) {
        var lowPoint = gradientPoints[i].value;
        var highPoint = gradientPoints[i + 1].value;
        var colorRect = document.createElement("td");
        colorRect.style.backgroundColor = "rgb(" + gradientPoints[i].red + "," + gradientPoints[i].green + "," + gradientPoints[i].blue + ")";
        var numberRect = document.createElement("td");
        var textDiv = document.createElement("div");
        var theText = document.createTextNode(gradientPoints[i].value);
        textDiv.appendChild(theText);
        numberRect.appendChild(textDiv);
        theRow1.appendChild(document.createElement("td"));
        theRow2.appendChild(colorRect);
        theRow3.appendChild(numberRect);
        colorRect.onmouseover = function () {
            this.style.border = "solid 1.2px";
        };
        colorRect.onmouseout = function () {
            this.style.border = "none";
        };
        counter++;
        for (var j = lowPoint + stepSize;
             j < highPoint;
             j += stepSize) {
            var fraction = (j - lowPoint) / (highPoint - lowPoint);
            var newRed = Math.floor(gradientPoints[i].red + fraction * (gradientPoints[i + 1].red - gradientPoints[i].red));
            var newGreen = Math.floor(gradientPoints[i].green + fraction * (gradientPoints[i + 1].green - gradientPoints[i].green));
            var newBlue = Math.floor(gradientPoints[i].blue + fraction * (gradientPoints[i + 1].blue - gradientPoints[i].blue));
            var colorRect = document.createElement("td");
            colorRect.count = counter;
            colorRect.style.backgroundColor = "rgb(" + newRed + "," + newGreen + "," + newBlue + ")";
            var numberRect = document.createElement("td");
            var textDiv = document.createElement("div");
            var theText = document.createTextNode((Math.floor(j * 100)) / 100);
            textDiv.appendChild(theText);
            numberRect.appendChild(textDiv);
            textDiv.style.width = "2px";
            textDiv.style.overflow = "hidden";
            textDiv.style.visibility = "hidden";
            theRow1.appendChild(numberRect);
            theRow2.appendChild(colorRect);
            theRow3.appendChild(document.createElement("td"));
            counter++;
            colorRect.onmouseover = function () {
                this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.visibility = "visible";
                this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.overflow = "visible";
                this.style.border = "solid 1.2px";
            };
            colorRect.onmouseout = function () {
                this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.visibility = "hidden";
                this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.overflow = "hidden";
                this.style.border = "none";
            };
        }
    }
    var high = gradientPoints.length - 1;
    var colorRect = document.createElement("td");
    colorRect.style.backgroundColor = "rgb(" + gradientPoints[high].red + "," + gradientPoints[high].green + "," + gradientPoints[high].blue + ")";
    var numberRect = document.createElement("td");
    var textDiv = document.createElement("div");
    var theText = document.createTextNode(globHighPoint);
    textDiv.appendChild(theText);
    numberRect.appendChild(textDiv);
    theRow1.appendChild(document.createElement("td"));
    theRow2.appendChild(colorRect);
    theRow3.appendChild(numberRect);
    counter++;
    colorRect.onmouseover = function () {
        this.style.border = "solid 1.2px";
    };
    colorRect.onmouseout = function () {
        this.style.border = "none";
    };
    this._div.appendChild(theTable);
};
Exhibit.LegendGradientWidget.prototype.addEntry = function (color, label) {
    var cell = document.createElement("td");
    cell.style.width = "1.5em";
    cell.style.height = "2em";
    this._theRow1.appendChild(cell);
    this._theRow1.appendChild(document.createElement("td"));
    this._theRow2.appendChild(document.createElement("td"));
    this._theRow3.appendChild(document.createElement("td"));
    var colorCell = document.createElement("td");
    colorCell.style.backgroundColor = color;
    this._theRow2.appendChild(colorCell);
    var labelCell = document.createElement("td");
    var labelDiv = document.createElement("div");
    labelDiv.appendChild(document.createTextNode(label));
    labelCell.appendChild(labelDiv);
    this._theRow3.appendChild(labelCell);
};
Exhibit.LegendGradientWidget.prototype.dispose = function () {
    this._div.innerHTML = "";
    this._div = null;
    this._uiContext = null;
};
Exhibit.LegendGradientWidget.prototype._initializeUI = function () {
    this._div.className = "exhibit-legendGradientWidget";
    this._div.innerHTML = "";
};
Exhibit.LegendGradientWidget.prototype.clear = function () {
    this._div.innerHTML = "";
};


/* legend-widget.js */
Exhibit.LegendWidget = function (configuration, containerElmt, uiContext) {
    this._configuration = configuration;
    this._div = containerElmt;
    this._jq = SimileAjax.jQuery(this._div);
    this._uiContext = uiContext;
    this._colorMarkerGenerator = "colorMarkerGenerator" in configuration ? configuration.colorMarkerGenerator : Exhibit.LegendWidget._defaultColorMarkerGenerator;
    this._sizeMarkerGenerator = "sizeMarkerGenerator" in configuration ? configuration.sizeMarkerGenerator : Exhibit.LegendWidget._defaultSizeMarkerGenerator;
    this._iconMarkerGenerator = "iconMarkerGenerator" in configuration ? configuration.iconMarkerGenerator : Exhibit.LegendWidget._defaultIconMarkerGenerator;
    this._labelStyler = "labelStyler" in configuration ? configuration.labelStyler : Exhibit.LegendWidget._defaultColorLabelStyler;
    this._initializeUI();
};
Exhibit.LegendWidget.create = function (configuration, containerElmt, uiContext) {
    return new Exhibit.LegendWidget(configuration, containerElmt, uiContext);
};
Exhibit.LegendWidget.prototype.dispose = function () {
    this._div.innerHTML = "";
    this._div = null;
    this._jq = null;
    this._uiContext = null;
};
Exhibit.LegendWidget.prototype._initializeUI = function () {
    this._div.className = "exhibit-legendWidget";
    this._div.innerHTML = "<div class='exhibit-color-legend'></div><div class='exhibit-size-legend'></div><div class='exhibit-icon-legend'></div>";
};
Exhibit.LegendWidget.prototype.clear = function () {
    this._div.innerHTML = "<div class='exhibit-color-legend'></div><div class='exhibit-size-legend'></div><div class='exhibit-icon-legend'></div>";
};
Exhibit.LegendWidget.prototype.addLegendLabel = function (label, type) {
    var dom = SimileAjax.DOM.createDOMFromString("div", "<div class='legend-label'><span class='label' class='exhibit-legendWidget-entry-title'>" + label.replace(/\s+/g, "\u00a0") + "</span>\u00a0\u00a0 </div>", {});
    dom.elmt.className = "exhibit-legendWidget-label";
    this._jq.find(".exhibit-" + type + "-legend").append(dom.elmt);
};
Exhibit.LegendWidget.prototype.addEntry = function (value, label, type) {
    type = type || "color";
    label = (label != null) ? label.toString() : "";
    var legendDiv = this._jq.find(".exhibit-" + type + "-legend");
    var marker;
    if (type == "color") {
        var dom = SimileAjax.DOM.createDOMFromString("span", "<span id='marker'></span>\u00a0<span id='label' class='exhibit-legendWidget-entry-title'>" + label.replace(/\s+/g, "\u00a0") + "</span>\u00a0\u00a0 ", {marker: this._colorMarkerGenerator(value)});
    }
    if (type == "size") {
        var dom = SimileAjax.DOM.createDOMFromString("span", "<span id='marker'></span>\u00a0<span id='label' class='exhibit-legendWidget-entry-title'>" + label.replace(/\s+/g, "\u00a0") + "</span>\u00a0\u00a0 ", {marker: this._sizeMarkerGenerator(value)});
    }
    if (type == "icon") {
        var dom = SimileAjax.DOM.createDOMFromString("span", "<span id='marker'></span>\u00a0<span id='label' class='exhibit-legendWidget-entry-title'>" + label.replace(/\s+/g, "\u00a0") + "</span>\u00a0\u00a0 ", {marker: this._iconMarkerGenerator(value)});
    }
    dom.elmt.className = "exhibit-legendWidget-entry";
    this._labelStyler(dom.label, value);
    legendDiv.append(dom.elmt);
};
Exhibit.LegendWidget._localeSort = function (a, b) {
    return a.localeCompare(b);
};
Exhibit.LegendWidget._defaultColorMarkerGenerator = function (value) {
    var span = document.createElement("span");
    span.className = "exhibit-legendWidget-entry-swatch";
    span.style.background = value;
    span.innerHTML = "\u00a0\u00a0";
    return span;
};
Exhibit.LegendWidget._defaultSizeMarkerGenerator = function (value) {
    var span = document.createElement("span");
    span.className = "exhibit-legendWidget-entry-swatch";
    span.style.height = value;
    span.style.width = value;
    span.style.background = "#C0C0C0";
    span.innerHTML = "\u00a0\u00a0";
    return span;
};
Exhibit.LegendWidget._defaultIconMarkerGenerator = function (value) {
    var span = document.createElement("span");
    span.className = "<img src=" + value + "/>";
    return span;
};
Exhibit.LegendWidget._defaultColorLabelStyler = function (elmt, value) {
};


/* logo.js */
Exhibit.Logo = function (elmt, exhibit) {
    this._exhibit = exhibit;
    this._elmt = elmt;
    this._color = "Silver";
};
Exhibit.Logo.create = function (configuration, elmt, exhibit) {
    var logo = new Exhibit.Logo(elmt, exhibit);
    if ("color" in configuration) {
        logo._color = configuration.color;
    }
    logo._initializeUI();
    return logo;
};
Exhibit.Logo.createFromDOM = function (elmt, exhibit) {
    var logo = new Exhibit.Logo(elmt, exhibit);
    var color = Exhibit.getAttribute(elmt, "color");
    if (color != null && color.length > 0) {
        logo._color = color;
    }
    logo._initializeUI();
    return logo;
};
Exhibit.Logo.prototype.dispose = function () {
    this._elmt = null;
    this._exhibit = null;
};
Exhibit.Logo.prototype._initializeUI = function () {
    var logoURL = "http://static.simile-widgets.org/graphics/logos/exhibit/exhibit-small-" + this._color + ".png";
    var img = SimileAjax.Graphics.createTranslucentImage(logoURL);
    var id = "exhibit-logo-image";
    if (!document.getElementById(id)) {
        img.id = id;
    }
    var a = document.createElement("a");
    a.href = "http://simile-widgets.org/exhibit/";
    a.title = "http://simile-widgets.org/exhibit/";
    a.target = "_blank";
    a.appendChild(img);
    this._elmt.appendChild(a);
};


/* option-widget.js */
Exhibit.OptionWidget = function (configuration, containerElmt, uiContext) {
    this._label = configuration.label;
    this._checked = "checked" in configuration ? configuration.checked : false;
    this._onToggle = configuration.onToggle;
    this._containerElmt = containerElmt;
    this._uiContext = uiContext;
    this._initializeUI();
};
Exhibit.OptionWidget.create = function (configuration, containerElmt, uiContext) {
    return new Exhibit.OptionWidget(configuration, containerElmt, uiContext);
};
Exhibit.OptionWidget.prototype.dispose = function () {
    this._containerElmt.innerHTML = "";
    this._dom = null;
    this._containerElmt = null;
    this._uiContext = null;
};
Exhibit.OptionWidget.uncheckedImageURL = Exhibit.urlPrefix + "images/option.png";
Exhibit.OptionWidget.checkedImageURL = Exhibit.urlPrefix + "images/option-check.png";
Exhibit.OptionWidget.uncheckedTemplate = "<span id='uncheckedSpan' style='display: none;'><img id='uncheckedImage' /> %0</span>";
Exhibit.OptionWidget.checkedTemplate = "<span id='checkedSpan' style='display: none;'><img id='checkedImage' /> %0</span>";
Exhibit.OptionWidget.prototype._initializeUI = function () {
    this._containerElmt.className = "exhibit-optionWidget";
    this._dom = SimileAjax.DOM.createDOMFromString(this._containerElmt, String.substitute(Exhibit.OptionWidget.uncheckedTemplate + Exhibit.OptionWidget.checkedTemplate, [this._label]), {uncheckedImage: SimileAjax.Graphics.createTranslucentImage(Exhibit.OptionWidget.uncheckedImageURL), checkedImage: SimileAjax.Graphics.createTranslucentImage(Exhibit.OptionWidget.checkedImageURL)});
    if (this._checked) {
        this._dom.checkedSpan.style.display = "inline";
    } else {
        this._dom.uncheckedSpan.style.display = "inline";
    }
    SimileAjax.WindowManager.registerEvent(this._containerElmt, "click", this._onToggle);
};
Exhibit.OptionWidget.prototype.getChecked = function () {
    return this._checked;
};
Exhibit.OptionWidget.prototype.setChecked = function (checked) {
    if (checked != this._checked) {
        this._checked = checked;
        if (checked) {
            this._dom.checkedSpan.style.display = "inline";
            this._dom.uncheckedSpan.style.display = "none";
        } else {
            this._dom.checkedSpan.style.display = "none";
            this._dom.uncheckedSpan.style.display = "inline";
        }
    }
};
Exhibit.OptionWidget.prototype.toggle = function () {
    this.setChecked(!this._checked);
};


/* resizable-div-widget.js */
Exhibit.ResizableDivWidget = function (configuration, elmt, uiContext) {
    this._div = elmt;
    this._configuration = configuration;
    if (!("minHeight" in configuration)) {
        configuration["minHeight"] = 10;
    }
    this._initializeUI();
};
Exhibit.ResizableDivWidget.create = function (configuration, elmt, uiContext) {
    return new Exhibit.ResizableDivWidget(configuration, elmt, uiContext);
};
Exhibit.ResizableDivWidget.prototype.dispose = function () {
    this._div.innerHTML = "";
    this._contentDiv = null;
    this._resizerDiv = null;
    this._div = null;
};
Exhibit.ResizableDivWidget.prototype.getContentDiv = function () {
    return this._contentDiv;
};
Exhibit.ResizableDivWidget.prototype._initializeUI = function () {
    var self = this;
    this._div.innerHTML = "<div></div><div class='exhibit-resizableDivWidget-resizer'>" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/down-arrow.png") + "</div>";
    this._contentDiv = this._div.childNodes[0];
    this._resizerDiv = this._div.childNodes[1];
    SimileAjax.WindowManager.registerForDragging(this._resizerDiv, {onDragStart: function () {
        this._height = self._contentDiv.offsetHeight;
    }, onDragBy: function (diffX, diffY) {
        this._height += diffY;
        self._contentDiv.style.height = Math.max(self._configuration.minHeight, this._height) + "px";
    }, onDragEnd: function () {
        if ("onResize" in self._configuration) {
            self._configuration["onResize"]();
        }
    }});
};


/* toolbox-widget.js */
Exhibit.ToolboxWidget = function (containerElmt, uiContext) {
    this._containerElmt = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    this._customExporters = [];
    this._hovering = false;
    this._initializeUI();
};
Exhibit.ToolboxWidget._settingSpecs = {"itemID": {type: "text"}};
Exhibit.ToolboxWidget.create = function (configuration, containerElmt, uiContext) {
    var widget = new Exhibit.ToolboxWidget(containerElmt, Exhibit.UIContext.create(configuration, uiContext));
    Exhibit.ToolboxWidget._configure(widget, configuration);
    widget._initializeUI();
    return widget;
};
Exhibit.ToolboxWidget.createFromDOM = function (configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var widget = new Exhibit.ToolboxWidget(containerElmt != null ? containerElmt : configElmt, Exhibit.UIContext.createFromDOM(configElmt, uiContext));
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ToolboxWidget._settingSpecs, widget._settings);
    Exhibit.ToolboxWidget._configure(widget, configuration);
    widget._initializeUI();
    return widget;
};
Exhibit.ToolboxWidget._configure = function (widget, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ToolboxWidget._settingSpecs, widget._settings);
};
Exhibit.ToolboxWidget.prototype.dispose = function () {
    this._containerElmt.onmouseover = null;
    this._containerElmt.onmouseout = null;
    this._dismiss();
    this._settings = null;
    this._containerElmt = null;
    this._uiContext = null;
};
Exhibit.ToolboxWidget.prototype.addExporter = function (exporter) {
    this._customExporters.push(exporter);
};
Exhibit.ToolboxWidget.prototype._initializeUI = function () {
    var self = this;
    this._containerElmt.onmouseover = function (evt) {
        self._onContainerMouseOver(evt);
    };
    this._containerElmt.onmouseout = function (evt) {
        self._onContainerMouseOut(evt);
    };
};
Exhibit.ToolboxWidget.prototype._onContainerMouseOver = function (evt) {
    if (!this._hovering) {
        var self = this;
        var coords = SimileAjax.DOM.getPageCoordinates(this._containerElmt);
        var docWidth = document.body.offsetWidth;
        var docHeight = document.body.offsetHeight;
        var popup = document.createElement("div");
        popup.className = "exhibit-toolboxWidget-popup screen";
        popup.style.top = coords.top + "px";
        popup.style.right = (docWidth - coords.left - this._containerElmt.offsetWidth) + "px";
        this._fillPopup(popup);
        document.body.appendChild(popup);
        popup.onmouseover = function (evt) {
            self._onPopupMouseOver(evt);
        };
        popup.onmouseout = function (evt) {
            self._onPopupMouseOut(evt);
        };
        this._popup = popup;
        this._hovering = true;
    } else {
        this._clearTimeout();
    }
};
Exhibit.ToolboxWidget.prototype._onContainerMouseOut = function (evt) {
    if (Exhibit.ToolboxWidget._mouseOutsideElmt(Exhibit.ToolboxWidget._getEvent(evt), this._containerElmt)) {
        this._setTimeout();
    }
};
Exhibit.ToolboxWidget.prototype._onPopupMouseOver = function (evt) {
    this._clearTimeout();
};
Exhibit.ToolboxWidget.prototype._onPopupMouseOut = function (evt) {
    if (Exhibit.ToolboxWidget._mouseOutsideElmt(Exhibit.ToolboxWidget._getEvent(evt), this._containerElmt)) {
        this._setTimeout();
    }
};
Exhibit.ToolboxWidget.prototype._setTimeout = function () {
    var self = this;
    this._timer = window.setTimeout(function () {
        self._onTimeout();
    }, 200);
};
Exhibit.ToolboxWidget.prototype._clearTimeout = function () {
    if (this._timer) {
        window.clearTimeout(this._timer);
        this._timer = null;
    }
};
Exhibit.ToolboxWidget.prototype._onTimeout = function () {
    this._dismiss();
    this._hovering = false;
    this._timer = null;
};
Exhibit.ToolboxWidget.prototype._fillPopup = function (elmt) {
    var self = this;
    var exportImg = Exhibit.UI.createTranslucentImage("images/liveclipboard-icon.png");
    exportImg.className = "exhibit-toolboxWidget-button";
    SimileAjax.WindowManager.registerEvent(exportImg, "click", function (elmt, evt, target) {
        self._showExportMenu(exportImg);
    });
    elmt.appendChild(exportImg);
};
Exhibit.ToolboxWidget.prototype._dismiss = function () {
    if (this._popup) {
        document.body.removeChild(this._popup);
        this._popup = null;
    }
};
Exhibit.ToolboxWidget._mouseOutsideElmt = function (evt, elmt) {
    var eventCoords = SimileAjax.DOM.getEventPageCoordinates(evt);
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    return((eventCoords.x < coords.left || eventCoords.x > coords.left + elmt.offsetWidth) || (eventCoords.y < coords.top || eventCoords.y > coords.top + elmt.offsetHeight));
};
Exhibit.ToolboxWidget._getEvent = function (evt) {
    return(evt) ? evt : ((event) ? event : null);
};
Exhibit.ToolboxWidget.prototype._showExportMenu = function (elmt) {
    var self = this;
    var popupDom = Exhibit.UI.createPopupMenuDom(elmt);
    var makeMenuItem = function (exporter) {
        popupDom.appendMenuItem(exporter.getLabel(), null, function () {
            var database = self._uiContext.getDatabase();
            var text = ("itemID" in self._settings) ? exporter.exportOne(self._settings.itemID, database) : exporter.exportMany(self._uiContext.getCollection().getRestrictedItems(), database);
            Exhibit.ToolboxWidget.createExportDialogBox(text).open();
        });
    };
    var exporters = Exhibit.getExporters();
    for (var i = 0;
         i < exporters.length;
         i++) {
        makeMenuItem(exporters[i]);
    }
    for (var i = 0;
         i < this._customExporters.length;
         i++) {
        makeMenuItem(this._customExporters[i]);
    }
    if ("getGeneratedHTML" in this) {
        makeMenuItem({getLabel: function () {
            return Exhibit.l10n.htmlExporterLabel;
        }, exportOne: this.getGeneratedHTML, exportMany: this.getGeneratedHTML});
    }
    popupDom.open();
};
Exhibit.ToolboxWidget.createExportDialogBox = function (string) {
    var template = {tag: "div", className: "exhibit-copyDialog exhibit-ui-protection", children: [
        {tag: "button", field: "closeButton", children: [Exhibit.l10n.exportDialogBoxCloseButtonLabel]},
        {tag: "p", children: [Exhibit.l10n.exportDialogBoxPrompt]},
        {tag: "div", field: "textAreaContainer"}
    ]};
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    dom.textAreaContainer.innerHTML = "<textarea wrap='off' rows='15'>" + string + "</textarea>";
    dom.close = function () {
        document.body.removeChild(dom.elmt);
    };
    dom.open = function () {
        dom.elmt.style.top = (document.body.scrollTop + 100) + "px";
        document.body.appendChild(dom.elmt);
        dom.layer = SimileAjax.WindowManager.pushLayer(function () {
            dom.close();
        }, false);
        var textarea = dom.textAreaContainer.firstChild;
        textarea.select();
        SimileAjax.WindowManager.registerEvent(dom.closeButton, "click", function (elmt, evt, target) {
            SimileAjax.WindowManager.popLayer(dom.layer);
        }, dom.layer);
        SimileAjax.WindowManager.registerEvent(textarea, "keyup", function (elmt, evt, target) {
            if (evt.keyCode == 27) {
                SimileAjax.WindowManager.popLayer(dom.layer);
            }
        }, dom.layer);
    };
    return dom;
};


/* coders.js */
Exhibit.Coders = new Object();
Exhibit.Coders.mixedCaseColor = "#fff";
Exhibit.Coders.othersCaseColor = "#aaa";
Exhibit.Coders.missingCaseColor = "#888";


/* facets.js */
Exhibit.FacetUtilities = new Object();
Exhibit.FacetUtilities.constructFacetFrame = function (forFacet, div, facetLabel, onClearAllSelections, uiContext, collapsible, collapsed) {
    div.className = "exhibit-facet";
    var dom = SimileAjax.DOM.createDOMFromString(div, "<div class='exhibit-facet-header'><div class='exhibit-facet-header-filterControl' id='clearSelectionsDiv' title='" + Exhibit.FacetUtilities.l10n.clearSelectionsTooltip + "'><span id='filterCountSpan'></span><img id='checkImage' /></div>" + ((collapsible) ? "<img src='" + Exhibit.urlPrefix + "images/collapse.png' class='exhibit-facet-header-collapse' id='collapseImg' />" : "") + "<span class='exhibit-facet-header-title'>" + facetLabel + "</span></div><div class='exhibit-facet-body-frame' id='frameDiv'></div>", {checkImage: Exhibit.UI.createTranslucentImage("images/black-check.png")});
    var resizableDivWidget = Exhibit.ResizableDivWidget.create({}, dom.frameDiv, uiContext);
    dom.valuesContainer = resizableDivWidget.getContentDiv();
    dom.valuesContainer.className = "exhibit-facet-body";
    dom.setSelectionCount = function (count) {
        this.filterCountSpan.innerHTML = count;
        this.clearSelectionsDiv.style.display = count > 0 ? "block" : "none";
    };
    SimileAjax.WindowManager.registerEvent(dom.clearSelectionsDiv, "click", onClearAllSelections);
    if (collapsible) {
        SimileAjax.WindowManager.registerEvent(dom.collapseImg, "click", function () {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        });
        if (collapsed) {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        }
    }
    return dom;
};
Exhibit.FacetUtilities.toggleCollapse = function (dom, facet) {
    var el = dom.frameDiv;
    if (el.style.display != "none") {
        el.style.display = "none";
        dom.collapseImg.src = Exhibit.urlPrefix + "images/expand.png";
    } else {
        el.style.display = "block";
        dom.collapseImg.src = Exhibit.urlPrefix + "images/collapse.png";
        if (typeof facet.onUncollapse == "function") {
            facet.onUncollapse();
        }
    }
};
Exhibit.FacetUtilities.isCollapsed = function (facet) {
    var el = facet._dom.frameDiv;
    return el.style.display == "none";
};
Exhibit.FacetUtilities.constructFacetItem = function (label, count, color, selected, facetHasSelection, onSelect, onSelectOnly, uiContext) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    var dom = SimileAjax.DOM.createDOMFromString("div", "<div class='exhibit-facet-value-count'>" + count + "</div><div class='exhibit-facet-value-inner' id='inner'>" + ("<div class='exhibit-facet-value-checkbox'>&#160;" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + (facetHasSelection ? (selected ? "images/black-check.png" : "images/no-check.png") : "images/no-check-no-border.png")) + "</div>") + "<a class='exhibit-facet-value-link' href='javascript:{}' id='link'></a></div>");
    dom.elmt.className = selected ? "exhibit-facet-value exhibit-facet-value-selected" : "exhibit-facet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.link.innerHTML = label;
        if (color != null) {
            dom.link.style.color = color;
        }
    } else {
        dom.link.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    return dom.elmt;
};
Exhibit.FacetUtilities.constructFlowingFacetFrame = function (forFacet, div, facetLabel, onClearAllSelections, uiContext, collapsible, collapsed) {
    div.className = "exhibit-flowingFacet";
    var dom = SimileAjax.DOM.createDOMFromString(div, "<div class='exhibit-flowingFacet-header'>" + ((collapsible) ? "<img src='" + Exhibit.urlPrefix + "images/collapse.png' class='exhibit-facet-header-collapse' id='collapseImg' />" : "") + "<span class='exhibit-flowingFacet-header-title'>" + facetLabel + "</span></div><div id='frameDiv'><div class='exhibit-flowingFacet-body' id='valuesContainer'></div></div>");
    dom.setSelectionCount = function (count) {
    };
    if (collapsible) {
        SimileAjax.WindowManager.registerEvent(dom.collapseImg, "click", function () {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        });
        if (collapsed) {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        }
    }
    return dom;
};
Exhibit.FacetUtilities.constructFlowingFacetItem = function (label, count, color, selected, facetHasSelection, onSelect, onSelectOnly, uiContext) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    var dom = SimileAjax.DOM.createDOMFromString("div", ("<div class='exhibit-flowingFacet-value-checkbox'>" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + (facetHasSelection ? (selected ? "images/black-check.png" : "images/no-check.png") : "images/no-check-no-border.png")) + "</div>") + "<a class='exhibit-flowingFacet-value-link' href='javascript:{}' id='inner'></a> <span class='exhibit-flowingFacet-value-count'>(" + count + ")</span>");
    dom.elmt.className = selected ? "exhibit-flowingFacet-value exhibit-flowingFacet-value-selected" : "exhibit-flowingFacet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.inner.innerHTML = label;
        if (color != null) {
            dom.inner.style.color = color;
        }
    } else {
        dom.inner.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.elmt.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    return dom.elmt;
};
Exhibit.FacetUtilities.constructHierarchicalFacetItem = function (label, count, color, selected, hasChildren, expanded, facetHasSelection, onSelect, onSelectOnly, onToggleChildren, uiContext) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    var dom = SimileAjax.DOM.createDOMFromString("div", "<div class='exhibit-facet-value-count'>" + count + "</div><div class='exhibit-facet-value-inner' id='inner'>" + ("<div class='exhibit-facet-value-checkbox'>&#160;" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + (facetHasSelection ? (selected ? "images/black-check.png" : "images/no-check.png") : "images/no-check-no-border.png")) + "</div>") + "<a class='exhibit-facet-value-link' href='javascript:{}' id='link'></a>" + (hasChildren ? ("<a class='exhibit-facet-value-children-toggle' href='javascript:{}' id='toggle'>" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/down-arrow.png") + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/right-arrow.png") + "</a>") : "") + "</div>" + (hasChildren ? "<div class='exhibit-facet-childrenContainer' id='childrenContainer'></div>" : ""));
    dom.elmt.className = selected ? "exhibit-facet-value exhibit-facet-value-selected" : "exhibit-facet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.link.appendChild(document.createTextNode(label));
        if (color != null) {
            dom.link.style.color = color;
        }
    } else {
        dom.link.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    if (hasChildren) {
        dom.showChildren = function (show) {
            dom.childrenContainer.style.display = show ? "block" : "none";
            dom.toggle.childNodes[0].style.display = show ? "inline" : "none";
            dom.toggle.childNodes[1].style.display = show ? "none" : "inline";
        };
        SimileAjax.WindowManager.registerEvent(dom.toggle, "click", onToggleChildren, SimileAjax.WindowManager.getBaseLayer());
        dom.showChildren(expanded);
    }
    return dom;
};
Exhibit.FacetUtilities.constructFlowingHierarchicalFacetItem = function (label, count, color, selected, hasChildren, expanded, facetHasSelection, onSelect, onSelectOnly, onToggleChildren, uiContext) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    var dom = SimileAjax.DOM.createDOMFromString("div", ("<div class='exhibit-flowingFacet-value-checkbox'>" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + (facetHasSelection ? (selected ? "images/black-check.png" : "images/no-check.png") : "images/no-check-no-border.png")) + "</div>") + "<a class='exhibit-flowingFacet-value-link' href='javascript:{}' id='inner'></a> <span class='exhibit-flowingFacet-value-count'>(" + count + ")</span>" + (hasChildren ? ("<a class='exhibit-flowingFacet-value-children-toggle' href='javascript:{}' id='toggle'>" + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/down-arrow.png") + SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/right-arrow.png") + "</a>") : "") + (hasChildren ? "<div class='exhibit-flowingFacet-childrenContainer' id='childrenContainer'></div>" : ""));
    dom.elmt.className = selected ? "exhibit-flowingFacet-value exhibit-flowingFacet-value-selected" : "exhibit-flowingFacet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.inner.appendChild(document.createTextNode(label));
        if (color != null) {
            dom.inner.style.color = color;
        }
    } else {
        dom.inner.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.elmt.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    if (hasChildren) {
        dom.showChildren = function (show) {
            dom.childrenContainer.style.display = show ? "block" : "none";
            dom.toggle.childNodes[0].style.display = show ? "inline" : "none";
            dom.toggle.childNodes[1].style.display = show ? "none" : "inline";
        };
        SimileAjax.WindowManager.registerEvent(dom.toggle, "click", onToggleChildren, SimileAjax.WindowManager.getBaseLayer());
        dom.showChildren(expanded);
    }
    return dom;
};
Exhibit.FacetUtilities.Cache = function (database, collection, expression) {
    var self = this;
    this._database = database;
    this._collection = collection;
    this._expression = expression;
    this._listener = {onRootItemsChanged: function () {
        if ("_itemToValue" in self) {
            delete self._itemToValue;
        }
        if ("_valueToItem" in self) {
            delete self._valueToItem;
        }
        if ("_missingItems" in self) {
            delete self._missingItems;
        }
    }};
    collection.addListener(this._listener);
};
Exhibit.FacetUtilities.Cache.prototype.dispose = function () {
    this._collection.removeListener(this._listener);
    this._collection = null;
    this._listener = null;
    this._itemToValue = null;
    this._valueToItem = null;
    this._missingItems = null;
};
Exhibit.FacetUtilities.Cache.prototype.getItemsFromValues = function (values, filter) {
    var set;
    if (this._expression.isPath()) {
        set = this._expression.getPath().walkBackward(values, "item", filter, this._database).getSet();
    } else {
        this._buildMaps();
        set = new Exhibit.Set();
        var valueToItem = this._valueToItem;
        values.visit(function (value) {
            if (value in valueToItem) {
                var itemA = valueToItem[value];
                for (var i = 0;
                     i < itemA.length;
                     i++) {
                    var item = itemA[i];
                    if (filter.contains(item)) {
                        set.add(item);
                    }
                }
            }
        });
    }
    return set;
};
Exhibit.FacetUtilities.Cache.prototype.getItemsMissingValue = function (filter, results) {
    this._buildMaps();
    results = results || new Exhibit.Set();
    var missingItems = this._missingItems;
    filter.visit(function (item) {
        if (item in missingItems) {
            results.add(item);
        }
    });
    return results;
};
Exhibit.FacetUtilities.Cache.prototype.getValueCountsFromItems = function (items) {
    var entries = [];
    var database = this._database;
    var valueType = "text";
    if (this._expression.isPath()) {
        var path = this._expression.getPath();
        var facetValueResult = path.walkForward(items, "item", database);
        valueType = facetValueResult.valueType;
        if (facetValueResult.size > 0) {
            facetValueResult.forEachValue(function (facetValue) {
                var itemSubcollection = path.evaluateBackward(facetValue, valueType, items, database);
                entries.push({value: facetValue, count: itemSubcollection.size});
            });
        }
    } else {
        this._buildMaps();
        valueType = this._valueType;
        for (var value in this._valueToItem) {
            var itemA = this._valueToItem[value];
            var count = 0;
            for (var i = 0;
                 i < itemA.length;
                 i++) {
                if (items.contains(itemA[i])) {
                    count++;
                }
            }
            if (count > 0) {
                entries.push({value: value, count: count});
            }
        }
    }
    return{entries: entries, valueType: valueType};
};
Exhibit.FacetUtilities.Cache.prototype.getValuesFromItems = function (items) {
    if (this._expression.isPath()) {
        return this._expression.getPath().walkForward(items, "item", database).getSet();
    } else {
        this._buildMaps();
        var set = new Exhibit.Set();
        var itemToValue = this._itemToValue;
        items.visit(function (item) {
            if (item in itemToValue) {
                var a = itemToValue[item];
                for (var i = 0;
                     i < a.length;
                     i++) {
                    set.add(a[i]);
                }
            }
        });
        return set;
    }
};
Exhibit.FacetUtilities.Cache.prototype.countItemsMissingValue = function (items) {
    this._buildMaps();
    var count = 0;
    for (var item in this._missingItems) {
        if (items.contains(item)) {
            count++;
        }
    }
    return count;
};
Exhibit.FacetUtilities.Cache.prototype._buildMaps = function () {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var valueToItem = {};
        var missingItems = {};
        var valueType = "text";
        var insert = function (x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [y];
            }
        };
        var expression = this._expression;
        var database = this._database;
        this._collection.getAllItems().visit(function (item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function (value) {
                    insert(item, value, itemToValue);
                    insert(value, item, valueToItem);
                });
            } else {
                missingItems[item] = true;
            }
        });
        this._itemToValue = itemToValue;
        this._valueToItem = valueToItem;
        this._missingItems = missingItems;
        this._valueType = valueType;
    }
};


/* set.js */
Exhibit.Set = function (a) {
    this._hash = {};
    this._count = 0;
    if (a instanceof Array) {
        for (var i = 0;
             i < a.length;
             i++) {
            this.add(a[i]);
        }
    } else {
        if (a instanceof Exhibit.Set) {
            this.addSet(a);
        }
    }
};
Exhibit.Set.prototype.add = function (o) {
    if (!(o in this._hash)) {
        this._hash[o] = true;
        this._count++;
        return true;
    }
    return false;
};
Exhibit.Set.prototype.addSet = function (set) {
    for (var o in set._hash) {
        this.add(o);
    }
};
Exhibit.Set.prototype.remove = function (o) {
    if (o in this._hash) {
        delete this._hash[o];
        this._count--;
        return true;
    }
    return false;
};
Exhibit.Set.prototype.removeSet = function (set) {
    for (var o in set._hash) {
        this.remove(o);
    }
};
Exhibit.Set.prototype.retainSet = function (set) {
    for (var o in this._hash) {
        if (!set.contains(o)) {
            delete this._hash[o];
            this._count--;
        }
    }
};
Exhibit.Set.prototype.contains = function (o) {
    return(o in this._hash);
};
Exhibit.Set.prototype.size = function () {
    return this._count;
};
Exhibit.Set.prototype.toArray = function () {
    var a = [];
    for (var o in this._hash) {
        a.push(o);
    }
    return a;
};
Exhibit.Set.prototype.visit = function (f) {
    for (var o in this._hash) {
        if (f(o) == true) {
            break;
        }
    }
};
Exhibit.Set.createIntersection = function (set1, set2, result) {
    var set = (result) ? result : new Exhibit.Set();
    var setA, setB;
    if (set1.size() < set2.size()) {
        setA = set1;
        setB = set2;
    } else {
        setA = set2;
        setB = set1;
    }
    setA.visit(function (v) {
        if (setB.contains(v)) {
            set.add(v);
        }
    });
    return set;
};


/* settings.js */
Exhibit.SettingsUtilities = new Object();
Exhibit.SettingsUtilities.collectSettings = function (config, specs, settings) {
    Exhibit.SettingsUtilities._internalCollectSettings(function (field) {
        return config[field];
    }, specs, settings);
};
Exhibit.SettingsUtilities.collectSettingsFromDOM = function (configElmt, specs, settings) {
    Exhibit.SettingsUtilities._internalCollectSettings(function (field) {
        return Exhibit.getAttribute(configElmt, field);
    }, specs, settings);
};
Exhibit.SettingsUtilities._internalCollectSettings = function (f, specs, settings) {
    for (var field in specs) {
        var spec = specs[field];
        var name = field;
        if ("name" in spec) {
            name = spec.name;
        }
        if (!(name in settings) && "defaultValue" in spec) {
            settings[name] = spec.defaultValue;
        }
        var value = f(field);
        if (value == null) {
            continue;
        }
        if (typeof value == "string") {
            value = value.trim();
            if (value.length == 0) {
                continue;
            }
        }
        var type = "text";
        if ("type" in spec) {
            type = spec.type;
        }
        var dimensions = 1;
        if ("dimensions" in spec) {
            dimensions = spec.dimensions;
        }
        try {
            if (dimensions > 1) {
                var separator = ",";
                if ("separator" in spec) {
                    separator = spec.separator;
                }
                var a = value.split(separator);
                if (a.length != dimensions) {
                    throw new Error("Expected a tuple of " + dimensions + " dimensions separated with " + separator + " but got " + value);
                } else {
                    for (var i = 0;
                         i < a.length;
                         i++) {
                        a[i] = Exhibit.SettingsUtilities._parseSetting(a[i].trim(), type, spec);
                    }
                    settings[name] = a;
                }
            } else {
                settings[name] = Exhibit.SettingsUtilities._parseSetting(value, type, spec);
            }
        } catch (e) {
            SimileAjax.Debug.exception(e);
        }
    }
};
Exhibit.SettingsUtilities._parseSetting = function (s, type, spec) {
    var sType = typeof s;
    if (type == "text") {
        return s;
    } else {
        if (type == "float") {
            if (sType == "number") {
                return s;
            } else {
                if (sType == "string") {
                    var f = parseFloat(s);
                    if (!isNaN(f)) {
                        return f;
                    }
                }
            }
            throw new Error("Expected a floating point number but got " + s);
        } else {
            if (type == "int") {
                if (sType == "number") {
                    return Math.round(s);
                } else {
                    if (sType == "string") {
                        var n = parseInt(s);
                        if (!isNaN(n)) {
                            return n;
                        }
                    }
                }
                throw new Error("Expected an integer but got " + s);
            } else {
                if (type == "boolean") {
                    if (sType == "boolean") {
                        return s;
                    } else {
                        if (sType == "string") {
                            s = s.toLowerCase();
                            if (s == "true") {
                                return true;
                            } else {
                                if (s == "false") {
                                    return false;
                                }
                            }
                        }
                    }
                    throw new Error("Expected either 'true' or 'false' but got " + s);
                } else {
                    if (type == "function") {
                        if (sType == "function") {
                            return s;
                        } else {
                            if (sType == "string") {
                                try {
                                    var f = eval(s);
                                    if (typeof f == "function") {
                                        return f;
                                    }
                                } catch (e) {
                                }
                            }
                        }
                        throw new Error("Expected a function or the name of a function but got " + s);
                    } else {
                        if (type == "enum") {
                            var choices = spec.choices;
                            for (var i = 0;
                                 i < choices.length;
                                 i++) {
                                if (choices[i] == s) {
                                    return s;
                                }
                            }
                            throw new Error("Expected one of " + choices.join(", ") + " but got " + s);
                        } else {
                            throw new Error("Unknown setting type " + type);
                        }
                    }
                }
            }
        }
    }
};
Exhibit.SettingsUtilities.createAccessors = function (config, specs, accessors) {
    Exhibit.SettingsUtilities._internalCreateAccessors(function (field) {
        return config[field];
    }, specs, accessors);
};
Exhibit.SettingsUtilities.createAccessorsFromDOM = function (configElmt, specs, accessors) {
    Exhibit.SettingsUtilities._internalCreateAccessors(function (field) {
        return Exhibit.getAttribute(configElmt, field);
    }, specs, accessors);
};
Exhibit.SettingsUtilities._internalCreateAccessors = function (f, specs, accessors) {
    for (var field in specs) {
        var spec = specs[field];
        var accessorName = spec.accessorName;
        var accessor = null;
        var isTuple = false;
        var createOneAccessor = function (spec2) {
            isTuple = false;
            if ("bindings" in spec2) {
                return Exhibit.SettingsUtilities._createBindingsAccessor(f, spec2.bindings);
            } else {
                if ("bindingNames" in spec2) {
                    isTuple = true;
                    return Exhibit.SettingsUtilities._createTupleAccessor(f, spec2);
                } else {
                    return Exhibit.SettingsUtilities._createElementalAccessor(f, spec2);
                }
            }
        };
        if ("alternatives" in spec) {
            var alternatives = spec.alternatives;
            for (var i = 0;
                 i < alternatives.length;
                 i++) {
                accessor = createOneAccessor(alternatives[i]);
                if (accessor != null) {
                    break;
                }
            }
        } else {
            accessor = createOneAccessor(spec);
        }
        if (accessor != null) {
            accessors[accessorName] = accessor;
        } else {
            if (!(accessorName in accessors)) {
                accessors[accessorName] = function (value, database, visitor) {
                };
            }
        }
    }
};
Exhibit.SettingsUtilities._createBindingsAccessor = function (f, bindingSpecs) {
    var bindings = [];
    for (var i = 0;
         i < bindingSpecs.length;
         i++) {
        var bindingSpec = bindingSpecs[i];
        var accessor = null;
        var isTuple = false;
        if ("bindingNames" in bindingSpec) {
            isTuple = true;
            accessor = Exhibit.SettingsUtilities._createTupleAccessor(f, bindingSpec);
        } else {
            accessor = Exhibit.SettingsUtilities._createElementalAccessor(f, bindingSpec);
        }
        if (accessor == null) {
            if (!("optional" in bindingSpec) || !bindingSpec.optional) {
                return null;
            }
        } else {
            bindings.push({bindingName: bindingSpec.bindingName, accessor: accessor, isTuple: isTuple});
        }
    }
    return function (value, database, visitor) {
        Exhibit.SettingsUtilities._evaluateBindings(value, database, visitor, bindings);
    };
};
Exhibit.SettingsUtilities._createTupleAccessor = function (f, spec) {
    var value = f(spec.attributeName);
    if (value == null) {
        return null;
    }
    if (typeof value == "string") {
        value = value.trim();
        if (value.length == 0) {
            return null;
        }
    }
    try {
        var expression = Exhibit.ExpressionParser.parse(value);
        var parsers = [];
        var bindingTypes = spec.types;
        for (var i = 0;
             i < bindingTypes.length;
             i++) {
            parsers.push(Exhibit.SettingsUtilities._typeToParser(bindingTypes[i]));
        }
        var bindingNames = spec.bindingNames;
        var separator = ",";
        if ("separator" in spec) {
            separator = spec.separator;
        }
        return function (itemID, database, visitor, tuple) {
            expression.evaluateOnItem(itemID, database).values.visit(function (v) {
                var a = v.split(separator);
                if (a.length == parsers.length) {
                    var tuple2 = {};
                    if (tuple) {
                        for (var n in tuple) {
                            tuple2[n] = tuple[n];
                        }
                    }
                    for (var i = 0;
                         i < bindingNames.length;
                         i++) {
                        tuple2[bindingNames[i]] = null;
                        parsers[i](a[i], function (v) {
                            tuple2[bindingNames[i]] = v;
                        });
                    }
                    visitor(tuple2);
                }
            });
        };
    } catch (e) {
        SimileAjax.Debug.exception(e);
        return null;
    }
};
Exhibit.SettingsUtilities._createElementalAccessor = function (f, spec) {
    var value = f(spec.attributeName);
    if (value == null) {
        return null;
    }
    if (typeof value == "string") {
        value = value.trim();
        if (value.length == 0) {
            return null;
        }
    }
    var bindingType = "text";
    if ("type" in spec) {
        bindingType = spec.type;
    }
    try {
        var expression = Exhibit.ExpressionParser.parse(value);
        var parser = Exhibit.SettingsUtilities._typeToParser(bindingType);
        return function (itemID, database, visitor) {
            expression.evaluateOnItem(itemID, database).values.visit(function (v) {
                return parser(v, visitor);
            });
        };
    } catch (e) {
        SimileAjax.Debug.exception(e);
        return null;
    }
};
Exhibit.SettingsUtilities._typeToParser = function (type) {
    switch (type) {
        case"text":
            return Exhibit.SettingsUtilities._textParser;
        case"url":
            return Exhibit.SettingsUtilities._urlParser;
        case"float":
            return Exhibit.SettingsUtilities._floatParser;
        case"int":
            return Exhibit.SettingsUtilities._intParser;
        case"date":
            return Exhibit.SettingsUtilities._dateParser;
        case"boolean":
            return Exhibit.SettingsUtilities._booleanParser;
        default:
            throw new Error("Unknown setting type " + type);
    }
};
Exhibit.SettingsUtilities._textParser = function (v, f) {
    return f(v);
};
Exhibit.SettingsUtilities._floatParser = function (v, f) {
    var n = parseFloat(v);
    if (!isNaN(n)) {
        return f(n);
    }
    return false;
};
Exhibit.SettingsUtilities._intParser = function (v, f) {
    var n = parseInt(v);
    if (!isNaN(n)) {
        return f(n);
    }
    return false;
};
Exhibit.SettingsUtilities._dateParser = function (v, f) {
    if (v instanceof Date) {
        return f(v);
    } else {
        if (typeof v == "number") {
            var d = new Date(0);
            d.setUTCFullYear(v);
            return f(d);
        } else {
            var d = SimileAjax.DateTime.parseIso8601DateTime(v.toString());
            if (d != null) {
                return f(d);
            }
        }
    }
    return false;
};
Exhibit.SettingsUtilities._booleanParser = function (v, f) {
    v = v.toString().toLowerCase();
    if (v == "true") {
        return f(true);
    } else {
        if (v == "false") {
            return f(false);
        }
    }
    return false;
};
Exhibit.SettingsUtilities._urlParser = function (v, f) {
    return f(Exhibit.Persistence.resolveURL(v.toString()));
};
Exhibit.SettingsUtilities._evaluateBindings = function (value, database, visitor, bindings) {
    var maxIndex = bindings.length - 1;
    var f = function (tuple, index) {
        var binding = bindings[index];
        var visited = false;
        var recurse = index == maxIndex ? function () {
            visitor(tuple);
        } : function () {
            f(tuple, index + 1);
        };
        if (binding.isTuple) {
            binding.accessor(value, database, function (tuple2) {
                visited = true;
                tuple = tuple2;
                recurse();
            }, tuple);
        } else {
            var bindingName = binding.bindingName;
            binding.accessor(value, database, function (v) {
                visited = true;
                tuple[bindingName] = v;
                recurse();
            });
        }
        if (!visited) {
            recurse();
        }
    };
    f({}, 0);
};


/* util.js */
Exhibit.Util = {};
Exhibit.Util.round = function (n, precision) {
    precision = precision || 1;
    var lg = Math.floor(Math.log(precision) / Math.log(10));
    n = (Math.round(n / precision) * precision).toString();
    var d = n.split(".");
    if (lg >= 0) {
        return d[0];
    }
    lg = -lg;
    d[1] = (d[1] || "").substring(0, lg);
    while (d[1].length < lg) {
        d[1] += "0";
    }
    return d.join(".");
};
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt) {
        var len = this.length;
        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
            from += len;
        }
        for (;
            from < len;
            from++) {
            if (from in this && this[from] === elt) {
                return from;
            }
        }
        return -1;
    };
}
if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun) {
        var len = this.length;
        if (typeof fun != "function") {
            throw new TypeError();
        }
        var res = new Array();
        var thisp = arguments[1];
        for (var i = 0;
             i < len;
             i++) {
            if (i in this) {
                var val = this[i];
                if (fun.call(thisp, val, i, this)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}
if (!Array.prototype.map) {
    Array.prototype.map = function (f, thisp) {
        if (typeof f != "function") {
            throw new TypeError();
        }
        if (typeof thisp == "undefined") {
            thisp = this;
        }
        var res = [], length = this.length;
        for (var i = 0;
             i < length;
             i++) {
            if (this.hasOwnProperty(i)) {
                res[i] = f.call(thisp, this[i], i, this);
            }
        }
        return res;
    };
}
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fun) {
        var len = this.length;
        if (typeof fun != "function") {
            throw new TypeError();
        }
        var thisp = arguments[1];
        for (var i = 0;
             i < len;
             i++) {
            if (i in this) {
                fun.call(thisp, this[i], i, this);
            }
        }
    };
}

/* views.js */
Exhibit.ViewUtilities = new Object();
Exhibit.ViewUtilities.openBubbleForItems = function (anchorElmt, arrayOfItemIDs, uiContext) {
    var coords = SimileAjax.DOM.getPageCoordinates(anchorElmt);
    var bubble = SimileAjax.Graphics.createBubbleForPoint(coords.left + Math.round(anchorElmt.offsetWidth / 2), coords.top + Math.round(anchorElmt.offsetHeight / 2), uiContext.getSetting("bubbleWidth"), uiContext.getSetting("bubbleHeight"));
    Exhibit.ViewUtilities.fillBubbleWithItems(bubble.content, arrayOfItemIDs, uiContext);
};
Exhibit.ViewUtilities.fillBubbleWithItems = function (bubbleElmt, arrayOfItemIDs, uiContext) {
    if (bubbleElmt == null) {
        bubbleElmt = document.createElement("div");
    }
    if (arrayOfItemIDs.length > 1) {
        bubbleElmt.className = [bubbleElmt.className, "exhibit-views-bubbleWithItems"].join(" ");
        var ul = document.createElement("ul");
        for (var i = 0;
             i < arrayOfItemIDs.length;
             i++) {
            uiContext.format(arrayOfItemIDs[i], "item", function (elmt) {
                var li = document.createElement("li");
                li.appendChild(elmt);
                ul.appendChild(li);
            });
        }
        bubbleElmt.appendChild(ul);
    } else {
        var itemLensDiv = document.createElement("div");
        var itemLens = uiContext.getLensRegistry().createLens(arrayOfItemIDs[0], itemLensDiv, uiContext);
        bubbleElmt.appendChild(itemLensDiv);
    }
    return bubbleElmt;
};
Exhibit.ViewUtilities.constructPlottingViewDom = function (div, uiContext, showSummary, resizableDivWidgetSettings, legendWidgetSettings) {
    var dom = SimileAjax.DOM.createDOMFromString(div, "<div class='exhibit-views-header'>" + (showSummary ? "<div id='collectionSummaryDiv'></div>" : "") + "<div id='unplottableMessageDiv' class='exhibit-views-unplottableMessage'></div></div><div id='resizableDiv'></div><div id='legendDiv'></div>", {});
    if (showSummary) {
        dom.collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create({}, dom.collectionSummaryDiv, uiContext);
    }
    dom.resizableDivWidget = Exhibit.ResizableDivWidget.create(resizableDivWidgetSettings, dom.resizableDiv, uiContext);
    dom.plotContainer = dom.resizableDivWidget.getContentDiv();
    dom.legendWidget = Exhibit.LegendWidget.create(legendWidgetSettings, dom.legendDiv, uiContext);
    if (legendWidgetSettings.colorGradient == true) {
        dom.legendGradientWidget = Exhibit.LegendGradientWidget.create(dom.legendDiv, uiContext);
    }
    dom.setUnplottableMessage = function (totalCount, unplottableItems) {
        Exhibit.ViewUtilities._setUnplottableMessage(dom, totalCount, unplottableItems, uiContext);
    };
    dom.dispose = function () {
        if (showSummary) {
            dom.collectionSummaryWidget.dispose();
        }
        if (dom.resizableDivWidget) {
            dom.resizableDivWidget.dispose();
        }
        if (dom.legendWidget) {
            dom.legendWidget.dispose();
        }
    };
    return dom;
};
Exhibit.ViewUtilities._setUnplottableMessage = function (dom, totalCount, unplottableItems, uiContext) {
    var div = dom.unplottableMessageDiv;
    if (unplottableItems.length == 0) {
        div.style.display = "none";
    } else {
        div.innerHTML = "";
        var dom = SimileAjax.DOM.createDOMFromString(div, Exhibit.ViewUtilities.l10n.unplottableMessageFormatter(totalCount, unplottableItems, uiContext), {});
        SimileAjax.WindowManager.registerEvent(dom.unplottableCountLink, "click", function (elmt, evt, target) {
            Exhibit.ViewUtilities.openBubbleForItems(elmt, unplottableItems, uiContext);
        });
        div.style.display = "block";
    }
};
