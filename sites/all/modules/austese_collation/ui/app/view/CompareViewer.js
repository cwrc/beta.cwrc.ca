Ext.define('TableApparatusApp.view.CompareViewer', {
  extend: 'Ext.window.Window',
  closable: false,
  height: 500,
  header: false,
  border: false,
  resizeHandles: '',
  width: 600,
  layout: {
    type: 'hbox',
    pack: 'start',
    align: 'stretch'
  },
  requires: [
    'TableApparatusApp.view.VersionView',
    'TableApparatusApp.view.VariantCountLabel'
  ],
  alias: 'widget.compareviewer',
  initComponent: function() {
    var me = this;

    Ext.applyIf(me, {
      cls: 'tableapp',
      dockedItems: [
        {
          xtype: 'toolbar',
          dock: 'bottom',
          items: [
            {
              itemId: 'prevVariantBtn1',
              iconCls: 'leftArrowIcon',
              cls: 'emicdora_previous_button',
              //tooltip: 'Go to previous variant'
            },
            {
              itemId: 'nextVariantBtn1',
              iconCls: 'rightArrowIcon',
              cls: 'emicdora_next_button',
              // tooltip: 'Go to next variant'
            },
            {
              xtype: 'tbspacer'
            },
            {
              xtype: 'variantcountlabel'
            },
            {xtype: 'tbfill'},
            {
              xtype: 'button',
              itemId: 'syncButton',
              enableToggle: true,
              pressed: true,
              tooltip: 'Toggle synchronization scrolling between versions',
              iconCls: 'syncIcon',
              cls: 'emicdora_sync_button',
            },
            {xtype: 'tbfill'},
            {
              xtype: 'variantcountlabel',
              style: {textAlign: 'right'}
            },
            {
              xtype: 'tbspacer'
            },
            {
              itemId: 'prevVariantBtn2',
              iconCls: 'leftArrowIcon',
              cls: 'emicdora_previous_button',
              //tooltip: 'Go to previous variant'
            },
            {
              itemId: 'nextVariantBtn2',
              iconCls: 'rightArrowIcon',
              cls: 'emicdora_next_button',
              //tooltip: 'Go to next variant'
            },
          ]
        },
        {
          xtype: 'toolbar',
          dock: 'top',
          items: [
            '->',
            {
              xtype: 'combobox',
              width: 200,
              itemId: 'documentSelector',
              forceSelection: true,
              fieldLabel: 'Selected Document',
              store: 'DocumentListStore',
              displayField: 'documentId',
              valueVield: 'documentId',
              editable: false,
              grow: true,
              labelWidth: 55,
              hidden: true
            },
            {
              xtype: 'button',
              iconCls: 'fullscreenIcon',
              itemId: 'toggleFullscreenButton',
              tooltip: 'Toggle fullscreen mode'
            }
          ]
        },
        {
          xtype: 'toolbar',
          dock: 'top',
          enableOverflow: false,
          items: [
            {
              xtype: 'combobox',
              itemId: 'versionSelector1',
              typeAhead: true,
              forceSelection: true,
              store: 'VersionListStore',
              displayField: 'longname',
              valueField: 'version',
              matchFieldWidth: false,
              editable: false,
              labelWidth: 55,
              width: '50%'
            },
            '->',
            {
              xtype: 'combobox',
              itemId: 'versionSelector2',
              typeAhead: true,
              forceSelection: true,
              store: 'VersionListStore',
              displayField: 'longname',
              valueField: 'version',
              matchFieldWidth: false,
              editable: false,
              labelWidth: 55,
              width: '50%'
            },
          ]
        }
      ],
      items: [
        {
          xtype: 'versionview',
          flex: 1,
          /*dockedItems: [{
           xtype: 'toolbar',
           dock: 'bottom',
           items: [

           {
           xtype:'tbfill'
           },
           {
           text: 'Prev'
           },
           {
           text: 'Next'
           }
           ]
           }]*/

        },
        {
          xtype: 'versionview',
          flex: 1
        }
      ]
    });

    me.callParent(arguments);
  }
});
