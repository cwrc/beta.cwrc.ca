var require = {
    paths: {
        'text': 'lib/require/text', // requirejs text plugin

        'jquery': ['http://code.jquery.com/jquery-1.9.1.min','lib/jquery/jquery-1.9.1'],
        'jquery-ui': ['lib/jquery/jquery-ui-1.10.4.min'],
        'jquery-migrate': ['lib/jquery/jquery-migrate-1.2.1'],
        'jquery.layout': 'lib/jquery/jquery.layout.min',
        'jquery.tablayout': 'lib/jquery/jquery.layout.resizeTabLayout-1.3',
        'jquery.contextmenu': 'lib/jquery/jquery.contextmenu',
        'jquery.tmpl': 'lib/jquery/jquery.tmpl.min',
        'jquery.watermark': 'lib/jquery/jquery.watermark.min',
        'jquery.jstree': 'lib/jstree/jstree.3.3.1.min',
        'jquery.snippet': 'lib/snippet/jquery.snippet.min',
        'jquery.xpath': 'lib/jquery/jquery.xpath',
        'jquery.popup': 'lib/jquery/jquery.popup',
        
        'tinymce': 'lib/tinymce4/tinymce',
        
        'objtree': 'lib/objtree/ObjTree',
        'moment': 'lib/moment/moment.min',
        
        'octokit': 'lib/octokit/octokit',
        
        'css.parser': 'lib/reworkcss/parser/parser',
        'css.stringify': 'lib/reworkcss/stringify/stringify',
        'css.compiler': 'lib/reworkcss/stringify/compiler',
        'css.compress': 'lib/reworkcss/stringify/compress',
        'css.identity': 'lib/reworkcss/stringify/identity',
        'inherits': 'lib/reworkcss/stringify/inherits',
        
        'schemaManager': 'schema/schemaManager',
        'mapper': 'schema/mapper',
        
        'dialogForm': 'dialogs/dialogForm',
        'attributeWidget': 'dialogs/attributeWidget',
        
        // cwrcDialogs
        'knockout': ['http://cdnjs.cloudflare.com/ajax/libs/knockout/3.3.0/knockout-min'],
        'bootstrap': ['https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min'],
        'bootstrap-datepicker': 'lib/cwrcDialogs/js/lib/bootstrap-datepicker',
        'cwrc-api': 'lib/cwrcDialogs/js/cwrc-api',
        'cwrcDialogs': 'lib/cwrcDialogs/js/cD'
    },
    shim: {
        'jquery-ui': ['jquery'],
        'jquery.layout': ['jquery', 'jquery-ui'],
        'jquery.tablayout': ['jquery.layout'],
        'jquery.contextmenu': ['jquery'],
        'jquery.tmpl': ['jquery'],
        'jquery.watermark': ['jquery'],
        'jquery.snippet': ['jquery', 'jquery-migrate'],
        'jquery.xpath': ['jquery'],
        'jquery.popup': ['jquery-ui'],
        'tinymce': {
            exports: 'tinymce',
            init: function() {
                this.tinymce.DOM.events.domLoaded = true;
                return this.tinymce;
            }
        },
        
        'bootstrap': ['jquery', 'jquery-ui'],
        'bootstrap-datepicker': ['bootstrap']
    }
    // cache busting
    // urlArgs: "bust=" +  (new Date()).getTime(),
};