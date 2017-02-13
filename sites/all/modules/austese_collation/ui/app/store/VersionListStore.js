Ext.define('TableApparatusApp.store.VersionListStore', {
    extend: 'Ext.data.Store',

    requires: [
        'TableApparatusApp.model.VersionListModel',
        'TableApparatusApp.reader.VersionListReader'
    ],

   // using the JSON data
     constructor: function(cfg) {
        var me = this;
        cfg = cfg || {};
        me.callParent([Ext.apply({
            storeId: 'VersionListStore',
            model: 'TableApparatusApp.model.VersionListModel',
            proxy: {
                type: 'ajax',
                pageParam: undefined,
                startParam: undefined,
                sortParam:undefined,
                limitParam: undefined,
                noCache: false,
                url: '', // managed by controller based on selected document id
                reader: {
                    type: 'json',
                    root: 'versions'
                }
            }
        }, cfg)]);
    }

});