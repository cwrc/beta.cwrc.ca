define(['jquery', 'jquery-ui', 'jquery.watermark'], function($, jqueryUi, watermark) {

return function(writer) {
    var w = writer;
    
    var precidateList = {
        person: ['is a child of', 'is a parent of', 'is related to', 'was born on', 'died on'],
        place: ['is located within', 'contains']
    };
    
    $(document.body).append(''+
    '<div id="tripleDialog">'+
        '<div id="tripleColumnsParent">'+
        '<div id="subjectColumn" class="column"><h2>Subject</h2><ul class="entitiesList"></ul><div class="customEntry"><input type="text" name="customSubject" value="" /></div></div>'+
        '<div id="predicateColumn" class="column"><h2>Predicate</h2><ul></ul><div class="customEntry"><input type="text" name="customPredicate" value="" /></div></div>'+
        '<div id="objectColumn" class="column"><h2>Object</h2><ul class="entitiesList"></ul><div class="customEntry"><input type="text" name="customObject" value="" /></div></div>'+
        '</div>'+
        '<div id="currentRelation">'+
        '<p></p><button type="button">Add Relation</button>'+
        '</div>'+
    '</div>');
    
    var d = $('#tripleDialog');
    var $writer = $('#cwrc_wrapper');
    d.dialog({
        title: 'Add Relation',
        modal: true,
        resizable: true,
        closeOnEscape: true,
        height: 450,
        width: 600,
        position: { my: "center", at: "center", of: $writer },
        autoOpen: false,
        buttons: {
            'Close': function() {
                d.dialog('close');
            }
        }
    });
    
    $('#subjectColumn input').watermark('Custom Subject');
    $('#predicateColumn input').watermark('Custom Predicate');
    $('#objectColumn input').watermark('Custom Object');
    
    $('#tripleColumnsParent input').keyup(function() {
        $(this).parents('.column').find('li').removeClass('selected');
        updateRelationString();
    });
    
    $('#currentRelation button').button({disabled: true}).click(function() {
        var components = getComponents();
        var subject = components[0];
        var predicate = components[1];
        var object = components[2];
        w.triples.push({
            subject: subject,
            predicate: {
                text: predicate.text,
                name: getPredicateName(predicate.text),
                external: predicate.external
            },
            object: object
        });
        w.relations.update();
    });
    
    var loadPredicates = function(type) {
        $('#predicateColumn > ul').empty();
        
        var p = precidateList[type] || ['is associated with'];
        var predicateString = '';
        for (var i = 0; i < p.length; i++) {
            predicateString += '<li>'+p[i]+'</li>';
        }
        $('#predicateColumn > ul').html(predicateString);
        
        $('#predicateColumn ul li').click(function() {
            $(this).siblings('li').removeClass('selected');
            $(this).toggleClass('selected');
            $(this).parents('.column').find('input').val('');
            updateRelationString();
        });
    };
    
    var getPredicateName = function(str) {
        var strs = str.split(/\s/);
        var name = '';
        for (var i = 0; i < strs.length; i++) {
            if (i == 0) {
                name += strs[i].toLowerCase();
            } else {
                name += strs[i].replace(/^./, function(s) {
                    return s.toUpperCase();
                });
            }
        }
        return name;
    };
    
    var getComponents = function() {
        var components = [null, null, null];
        $('#tripleColumnsParent ul').each(function(index, el) {
            var s = $(this).find('.selected');
            if (s.length == 1) {
                var uri = '';
                var id = s.attr('name');
                if (id != null) {
                    uri = w.entitiesManager.getEntity(id).getUris().annotationId;
                }
                components[index] = {text: w.utilities.escapeHTMLString(s.text()), uri: uri, external: false};
            }
        });
        $('#tripleColumnsParent input').each(function(index, el) {
            var val = $(this).val();
            if (val != '') components[index] = {text: w.utilities.escapeHTMLString(val), uri: w.utilities.escapeHTMLString(val), external: true};
        });
        
        return components;
    };
    
    var updateRelationString = function() {
        var str = '';
        var components = getComponents();
        var enable = true;
        for (var i = 0; i < components.length; i++) {
            var c = components[i];
            if (c == null) {
                enable = false;
            } else {
                str += c.text;
                if (i < 2) {
                    str += ' ';
                } else {
                    str += '.';
                }
            }
        }
        
        $('#currentRelation p').text(str);
        
        if (enable) {
            $('#currentRelation button').button('enable');
        } else {
            $('#currentRelation button').button('disable');
        }
    };
    
    var buildEntity = function(entity) {
        return '<li class="'+entity.getType()+'" name="'+entity.getId()+'">'+
            '<span class="box"/><span class="entityTitle">'+entity.getTitle()+'</span>'+
        '</li>';
    };
    
    return {
        show: function(config) {
            $('#subjectColumn > ul, #predicateColumn > ul, #objectColumn > ul').empty();
            
            $('#currentRelation p').html('');
            
            var entitiesString = '';
            
            w.entitiesManager.eachEntity(function(id, entity) {
                entitiesString += buildEntity(entity);
            });
            
            $('#subjectColumn > ul, #objectColumn > ul').html(entitiesString);
            $('#tripleDialog .entitiesList > li').hover(function() {
                if (!$(this).hasClass('selected')) {
                    $(this).addClass('over');
                }
            },function() {
                if (!$(this).hasClass('selected')) {
                    $(this).removeClass('over');
                }
            }).click(function(event) {
                $(this).siblings('li').removeClass('selected');
                $(this).removeClass('over').toggleClass('selected');
                $(this).parents('.column').find('input').val('');
                if ($(this).parents('#subjectColumn').length > 0) {
                    if ($(this).hasClass('selected')) {
                        var type = w.entitiesManager.getEntity($(this).attr('name')).getType();
                        loadPredicates(type);
                    } else {
                        $('#predicateColumn > ul').empty();
                    }
                }
                
                updateRelationString();
            });
            
            
            
            d.dialog('open');
        },

        hide: function() {
            d.dialog('close');
        }
    };
};

});