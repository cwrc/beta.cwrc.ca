(: output JSON used to build an Entity Aggregation page :)

xquery version "3.0" encoding "utf-8";

(: import helper modules :)
import module namespace cwAccessibility="cwAccessibility" at "./islandora_access_control.xq"; (: Fedora XACML permissions :)
import module namespace cwJSON="cwJSONHelpers" at "./helpers/cwrc_JSON_helpers.xq"; (: common JSON functions :)


(: declare namespaces used in the content :)
declare namespace mods = "http://www.loc.gov/mods/v3";
declare namespace tei =  "http://www.tei-c.org/ns/1.0";
declare namespace fedora =  "info:fedora/fedora-system:def/relations-external#";
declare namespace fedora-model="info:fedora/fedora-system:def/model#"; 
declare namespace rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#";

(: options :)
declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
(: declare option output:method   "xml"; :)
declare option output:method "text";
declare option output:encoding "UTF-8";
declare option output:indent   "no";

(: declare boundary-space preserve; :)
(: database must be imported with the following option otherwise text nodes have the begining and ending whitespace "chopped off" which is undesireable for mixed content:)
declare option db:chop 'false';

(: external variables :)
declare variable $FEDORA_PID external := "";
declare variable $BASE_URL external := "";
declare variable $ENTITY_URI external := ("http://www.geonames.org/6251999");

(: internal constants :)
declare variable $ENTITY_SOURCE_CWRC as xs:string := 'CWRC';
declare variable $ENTITY_SOURCE_VIAF as xs:string := 'VIAF';
declare variable $ENTITY_SOURCE_GEONAMES as xs:string := 'GEONAMES';
declare variable $ENTITY_SOURCE_GOOGLE as xs:string := 'GOOGLE';
declare variable $CMODEL_MULTIMEDIA := ("info:fedora/islandora:sp_basic_image", "info:fedora/islandora:sp_large_image_cmodel", "info:fedora/islandora:sp-audioCModel", "info:fedora/islandora:sp_videoCModel");

(: 
* Helper functions  
:)

declare function local:getPIDfromURI($uri) as xs:string?
{
    tokenize(replace($ENTITY_URI,'/$',''),'/')[last()] 
};

(: given an URI, determine the source e.g. cwrc, viaf, geonames, etc. :)
declare function local:getEntitySource($query_uri) as xs:string?
{
    if ( matches($query_uri,'cwrc.ca') ) then
        ( $ENTITY_SOURCE_CWRC )
    else if ( matches($query_uri,'viaf.org') ) then
        ( $ENTITY_SOURCE_VIAF )
    else if ( matches($query_uri,'geonames.org') ) then
        ( $ENTITY_SOURCE_GEONAMES )
    else if ( matches($query_uri,'google.*/maps') ) then
        ( $ENTITY_SOURCE_GOOGLE )
    else
        ( '' )
};


(: given a sequence of URIs, lookup thier details and return JSON :)
declare function local:outputURISeqDetails($key as xs:string?, $sequence as xs:string*) as xs:string?
{
  let $arrayStr := local:outputURIWithLabel($sequence)
  return string('"'||$key||'":'||$arrayStr)
};


(: given a sequence of URI's, build a JSON response that includes a label :)
(: assumes the external entities have a local stub :)
declare function local:outputURIWithLabel($uriSeq) as xs:string?
{
  (: 
    Kludge to account for "commons.cwrc.ca" URI not being included
    within CWRC entities as of 2016-05-24
  :)
  let $kludgeSeq :=
    for $i in ($uriSeq)
    return
      if ( local:getEntitySource($i) = $ENTITY_SOURCE_CWRC ) then
        local:getPIDfromURI($i)
      else
        ()
  let $tmp := collection()/obj[(PERSON_DS|PLACE_DS|ORGANIZATION_DS)/entity/(person|place|organization)/recordInfo/entityId = $uriSeq or @pid = $kludgeSeq]
    
  (: 
    ToDo: add "commons.cwrc.ca" to the CWRC entities such that the 
    following works for both commons.cwrc.ca entities and external stub 
    entities stored locally
  :)
  (: before Kludge: 
  let $tmp := collection()/obj[(PERSON_DS|PLACE_DS|ORGANIZATION_DS)/entity/(person|place|organization)/recordInfo/entityId = $uriSeq]
  :)
  return
    json:serialize(
      <json type='array'>
      {
        for $i in ($tmp)
        return
        <_ type='object'>
        <fedoraLabel>
        {$i/@label/data()}
        </fedoraLabel>
        <uri>
        {$i/(PERSON_DS|PLACE_DS|ORGANIZATION_DS)/entity/(person|place|organization)/recordInfo/entityId/text()}
        </uri>
        <pid>
        {$i/@pid/data()}
        </pid>
        </_>
      }
      </json>
      , map { 'indent':false()}
    )
  
};


(: given a PERSON object XML node, fill out the Profile section of the JSON return :)
declare function local:populateProfilePerson($obj,$objCModel)
{
  ',&#10;'
  || '"profile": {'
  || 
  fn:string-join(
    (
      cwJSON:outputJSON("fedora_label", $obj/@label/data() )
(:
      , cwJSON:outputJSONNotNull("factuality", $obj/PERSON_DS//entity/person/description/factuality/text() )
      , cwJSON:outputJSONArray("genders", $obj/PERSON_DS//entity/person/description/gender/genders/text() )
      , cwJSON:outputJSONArray("activities", $obj/PERSON_DS//entity/person/description/activities/activity/text() )
      , cwJSON:outputJSONArray("interests", $obj/PERSON_DS//entity/person/description/researchInterests/interest/text() )
      , cwJSON:outputJSONArray("occupations", $obj/PERSON_DS//entity/person/description/occupations/occupation/text() )
      , cwJSON:outputJSONArray("resources", $obj/PERSON_DS//entity/person/description/relatedResources/resource/text() )
      , cwJSON:outputJSONArray("personTypes", $obj/PERSON_DS//entity/person/relatedInfor/personTypes/personType/text() )
      , cwJSON:outputJSONArray ("projectIDs", $obj/PERSON_DS//entity/person/recordInfo/originInfo/projectId/text() )      
      , cwJSON:outputJSONNotNull("pid", $obj/@pid/data() )
      , cwJSON:outputJSONNotNull("createDate", $obj/@createDate/data() )
      , cwJSON:outputJSONNotNull("modifiedDate", $obj/@modifiedDate/data() )      
      , cwJSON:outputJSONNotNull("modifiedDate", $obj/@modifiedDate/data() )      
      , cwJSON:outputJSONNotNull("cModel", $objCModel )      
:)
    )
  )
  || '}'
};


(: given an ORGANIZATION object XML node, fill out the Profile section of the JSON return :)
declare function local:populateProfileOrganization($obj,$objCModel)
{
  ',&#10;'
  || '"profile": {'
  || 
  fn:string-join(
    (
      cwJSON:outputJSON("fedora_label", $obj/@label/data() )
(:
      , cwJSON:outputJSONArray ("projectIDs", $obj/ORGANIZATION_DS/entity/person/recordInfo/originInfo/projectId/text() )
      , cwJSON:outputJSONNotNull("factuality", $obj/ORGANIZATION_DS/entity/person/description/factuality/text() )
      , cwJSON:outputJSONArray("genders", $obj/ORGANIZATION_DS/entity/person/description/gender/genders/text() )
      , cwJSON:outputJSONNotNull("pid", $obj/@pid/data() )
      , cwJSON:outputJSONNotNull("createDate", $obj/@createDate/data() )
      , cwJSON:outputJSONNotNull("modifiedDate", $obj/@modifiedDate/data() )
      , cwJSON:outputJSONNotNull("cModel", $objCModel )      
:)
    )
  )
  || '}'
};


(: given an PLACE object XML node, fill out the Profile section of the JSON return :)
declare function local:populateProfilePlace($obj,$objCModel)
{
  ',&#10;'
  || '"profile": {'
  || 
  fn:string-join(
    (
      cwJSON:outputJSON("fedora_label", $obj/@label/data() )
(:
      , cwJSON:outputJSONArray ("projectIDs", $obj/PLACE_DS/entity/person/recordInfo/originInfo/projectId/text() )
      , cwJSON:outputJSONNotNull("factuality", $obj/PLACE_DS/entity/person/description/factuality/text() )
      , cwJSON:outputJSONNotNull("pid", $obj/@pid/data() )
      , cwJSON:outputJSONNotNull("createDate", $obj/@createDate/data() )
      , cwJSON:outputJSONNotNull("modifiedDate", $obj/@modifiedDate/data() )
      , cwJSON:outputJSONNotNull("cModel", $objCModel )      
:)
    )
  )
  || '}'
};


(: given an TITLE object XML node, fill out the Profile section of the JSON return :)
declare function local:populateProfileTitle($obj,$objCModel)
{
  ',&#10;'
  || '"profile": {'
  || 
  fn:string-join(
    (
      cwJSON:outputJSON("fedora_label", $obj/@label/data() )
(:
      , cwJSON:outputJSONArray ("projectIDs", $obj/PERSON_DS/entity/person/recordInfo/originInfo/projectId/text() )
      , cwJSON:outputJSONNotNull("factuality", $obj/PERSON_DS/entity/person/description/factuality/text() )
      , cwJSON:outputJSONArray("genders", $obj/PERSON_DS/entity/person/description/gender/genders/text() )
      , cwJSON:outputJSONArray("occupations", $obj/PERSON_DS/entity/person/description/occupations/occupation/text() )
      , cwJSON:outputJSONArray("activities", $obj/PERSON_DS/entity/person/description/activities/activity/text() )      
      , cwJSON:outputJSONArray("interests", $obj/PERSON_DS/entity/person/description/researchInterests/interest/text() )      
      , cwJSON:outputJSONNotNull("pid", $obj/@pid/data() )
      , cwJSON:outputJSONNotNull("createDate", $obj/@createDate/data() )
      , cwJSON:outputJSONNotNull("modifiedDate", $obj/@modifiedDate/data() )
      , cwJSON:outputJSONNotNull("cModel", $objCModel )      
:)
    )
  )
  || '}'
};




(: 
* Build the entity profile components for a given entity URI and return a JSON result
* E.G. name, gender, etc.
* base on the cModel of the given URI
:)
declare function local:buildEntityProfile($entityObj, $entityCModel) as xs:string?
{

    switch ( $entityCModel )
        case "info:fedora/cwrc:person-entityCModel" 
            return local:populateProfilePerson($entityObj,$entityCModel)
        case "info:fedora/cwrc:organization-entityCModel"
            return local:populateProfileOrganization($entityObj,$entityCModel)
        case "info:fedora/cwrc:place-entityCModel"
            return local:populateProfilePlace($entityObj,$entityCModel)
        case "info:fedora/cwrc:title-entityCModel"
            return local:populateProfileTitle($entityObj,$entityCModel)  
        default 
            return ''
};


(: **************** Material section ********************** :)

(:
* given a sequence of URIs, find all the material that reference that entity
* e.g., use one of the URIs as a reference target in a given context
:)
(: given a person entity, build a JSON representation from the material:)
declare function local:populateMaterialPerson($query_uri_seq) as xs:string
{

    (: Entries about a given person :)
    (: cModel = cwrc:documentCModel & mods:genre = ("Biography", "Born digital") & mods:subject/mods:name/@valueURI :)      
    let $entries_about :=  cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital", "born digital", "Born Digital") 
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/@pid/data()
            
    (: Works of the given person :)
    (: mods:name/@valueURI :)
    let $works :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:name/@valueURI=$query_uri_seq
            ]/@pid/data() 
            
            
    (: Mentions of a given person (excluding about the given person) :)    
    (: cModel = cwrc:documentCModel & NOT(mods:subject/mods:name/@valueURI) :)
    (: TEI ==> /persName/@ref or CWRC entry ==>/NAME/@REF or Orlando ==> /NAME/@REF or /subject/topic/@valueURI :)
    (: QUESTION: does look into the "content" datastream i.e. TEI/CWRC/Orlando schemas? :)
    let $entries_mentioning :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            and ( (: exclude items about the given person :)
                MODS_DS/mods:mods/mods:subject/mods:name/@valueURI != $query_uri_seq
                or
                not(MODS_DS/mods:mods/mods:subject/mods:name/@valueURI)
              )
            and (
                CWRC_DS//(tei:persName/@ref|NAME/@REF)=$query_uri_seq
                or
                MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
                )
            ]/@pid/data()
            
    (: bibliographic about the given person :) 
    (: mods:subject/mods:name/@valueURI :)
    let $bibliographic_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq]/@pid/data() 
            
            
    (: multimedia objects about the given person :)
    (: cModel = ("info:fedora/islandora:sp_basic_image", "info:fedora/islandora:sp_large_image_cmodel",     
        "info:fedora/islandora:sp-audioCModel", "info:fedora/islandora:sp_videoCModel") and mods:subject/mods:name/@valueURI  :)
    let $multimedia :=
      cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data() = $CMODEL_MULTIMEDIA 
            and 
              (
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/name/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI = $query_uri_seq
                )
            ]/@pid/data()
                  
    
    return 
        string-join(
            (
            cwJSON:outputJSONArray ("entries_about", $entries_about )
            , cwJSON:outputJSONArray ("bibliographic_about", $works )
            , cwJSON:outputJSONArray ("entries_mentioning", $entries_mentioning )
            , cwJSON:outputJSONArray ("bibliographic_related", $bibliographic_about )
            , cwJSON:outputJSONArray ("multimedia", $multimedia )        
            )
            , ','
        )    
    
};


(: given an organization entity, build a JSON representation from the material:)
declare function local:populateMaterialOrganization($query_uri_seq) as xs:string
{

    (: Entries about a given organization :)     
    (: cModel = cwrc:documentCModel & mods:genre = ("Biography", "Born digital") & mods:subject/mods:name/@valueURI :)
    (: same as person "entries_about" :)
    let $entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital")  :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/@pid/data() 

            
    (: bibliographic about a given organization :)    
    (: mods:subject/topic/@valueURI :)
    let $bibliographic_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
            ]/@pid/data() 

            
    (: bibliographic mentioning the given organization - author/editor ( :)    
    (: unfortunately, the LC has not defined a @valueURI attribute for the /originInfo/publisher element :)
    (: mods:name/@valueURI or mods:relatedItem/name :)
    let $bibliographic_related :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI=$query_uri_seq
            ]/@pid/data() 
        

    (: Mentions of a given organization (excluding about the given organization :)    
    (: cModel = cwrc:documentCModel & NOT(mods:subject/mods:name/@valueURI) :)
    (: TEI ==> /persName/@ref or CWRC entry ==>/NAME/@REF or Orlando ==> /NAME/@REF or /subject/topic/@valueURI :)
    (: QUESTION: does look into the "content" datastream i.e. TEI/CWRC/Orlando schemas? :)
    let $entries_mentioning :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            and ( (: exclude items about the given organization :)
                MODS_DS/mods:mods/mods:subject/mods:name/@valueURI != $query_uri_seq
                or
                not(MODS_DS/mods:mods/mods:subject/mods:name/@valueURI)
            ) 
            and (
                CWRC_DS//(tei:orgName/@ref|ORGNAME/@REF)=$query_uri_seq
                or
                MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
                )
            ]/@pid/data()
          
    
    (: multimedia objects about the given organization :)
    (: cModel = ("info:fedora/islandora:sp_basic_image", "info:fedora/islandora:sp_large_image_cmodel",  
    info:fedora/islandora:sp-audioCModel", "info:fedora/islandora:sp_videoCModel") and mods:subject/mods:name/@valueURI  :)
    let $multimedia :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data() = $CMODEL_MULTIMEDIA 
            and 
              (
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/name/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI = $query_uri_seq
                )
            ]/@pid/data()

    
    return 
        string-join(
            (
            cwJSON:outputJSONArray ("entries_about", $entries_about )
            , cwJSON:outputJSONArray ("bibliographic_about", $bibliographic_about )
            , cwJSON:outputJSONArray ("entries_mentioning", $entries_mentioning )
            , cwJSON:outputJSONArray ("bibliographic_related", $bibliographic_related )
            , cwJSON:outputJSONArray ("multimedia", $multimedia )        
            )
            , ','
        )
};


(: given an place entity, build a JSON representation from the material:)
declare function local:populateMaterialPlace($query_uri_seq) as xs:string
{
    (: Entries about a given place :)     
    (: cModel = cwrc:documentCModel & mods:genre = ("Biography", "Born digital") & mods:subject/mods:geographic/@valueURI :)
    let $entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital")  :)
            and MODS_DS/mods:mods/mods:subject/mods:geographic/@valueURI = $query_uri_seq
            ]/@pid/data() 
            
    (: bibliographic about a given place :)    
    (: mods:subject/topic/@valueURI :)
    let $bibliographic_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
            ]/@pid/data() 

    (: Mentions of a given place (excluding about the given or) :)    
    (: cModel = cwrc:documentCModel & NOT(mods:subject/mods:geogrpahic/@valueURI) :)
    (: TEI ==> /persName/@ref or CWRC entry ==>/NAME/@REF or Orlando ==> /NAME/@REF or /subject/(geographic|topic)/@valueURI :)
    let $entries_mentioning :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            and ( (: exclude items about the given place:)
                MODS_DS/mods:mods/mods:subject/mods:geographic/@valueURI != $query_uri_seq
                or 
                not(MODS_DS/mods:mods/mods:subject/mods:geographic/@valueURI)
              )
            and (
                CWRC_DS//(tei:placeName/@ref|PLACE/@REF)/data()=$query_uri_seq
                or
                MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
                )
            ]/@pid/data()

    (: bibliographic mentioning the given place  :)    
    (:  :)
    (:  :)
    let $bibliographic_related :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:originInfo/mods:place/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:relatedItem/mods:orginInfo/mods:place/@valueURI=$query_uri_seq
            ]/@pid/data() 
        

    (: multimedia objects about the given ploace :)
    (: cModel = ("info:fedora/islandora:sp_basic_image", "info:fedora/islandora:sp_large_image_cmodel",  
    info:fedora/islandora:sp-audioCModel", "info:fedora/islandora:sp_videoCModel") and mods:subject/mods:name/@valueURI  :)
    let $multimedia :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data() = $CMODEL_MULTIMEDIA 
            and 
              (
                MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq                
                )
            ]/@pid/data()
            
    return 
        string-join(
            (
            cwJSON:outputJSONArray ("entries_about", $entries_about )
            , cwJSON:outputJSONArray ("bibliographic_about", $bibliographic_about )
            , cwJSON:outputJSONArray ("entries_mentioning", $entries_mentioning )
            , cwJSON:outputJSONArray ("bibliographic_related", $bibliographic_about )
            , cwJSON:outputJSONArray ("multimedia", $multimedia )        
            )
            , ','
        )
};


(: given an title entity, build a JSON representation from the material:)
declare function local:populateMaterialTitle($query_uri_seq) as xs:string
{
    (: Entries about a given title :)     
    (: cModel = cwrc:documentCModel & mods:genre = ("Biography", "Born digital") & mods:subject/mods:geographic/@valueURI :)
    let $entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital")  :)
            and MODS_DS/mods:mods/mods:subject/mods:titleInfo/@valueURI = $query_uri_seq
            ]/@pid/data() 
            
    (: bibliographic about a given place :)    
    (: mods:subject/topic/@valueURI :)
    let $bibliographic_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
            ]/@pid/data() 

            
    (: Mentions of a given title (excluding about the given or) :)    
    (: cModel = cwrc:documentCModel & NOT(mods:subject/mods:geogrpahic/@valueURI) :)
    let $entries_mentioning :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            and ( (: exclude items about the given title :)
                MODS_DS/mods:mods/mods:subject/mods:geographic/@valueURI != $query_uri_seq
                or
                not(MODS_DS/mods:mods/mods:subject/mods:geographic/@valueURI)
              )
            and (
                CWRC_DS//(tei:title/@ref|TITLE/@REF)=$query_uri_seq
                or
                CWRC_DS//(tei:note/tei:bibl/@ref|(BIBCIT|TEXTSCOPE)/@REF)=$query_uri_seq
                or                
                MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq
                )
            ]/@pid/data()


    (: multimedia objects about the given title :)
    (: cModel = ("info:fedora/islandora:sp_basic_image", "info:fedora/islandora:sp_large_image_cmodel",  
    info:fedora/islandora:sp-audioCModel", "info:fedora/islandora:sp_videoCModel") and mods:subject/mods:name/@valueURI  :)
    let $multimedia :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data() = $CMODEL_MULTIMEDIA 
            and 
              (
                MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:subject/mods:titleInfo/mods:title/@valueURI = $query_uri_seq
                or
                MODS_DS/mods:mods/mods:name/@valueURI = $query_uri_seq
                or 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI = $query_uri_seq
                )
            ]/@pid/data()

        
    return 
        string-join(
            (
            cwJSON:outputJSONArray ("entries_about", $entries_about )
            , cwJSON:outputJSONArray ("bibliographic_about", $bibliographic_about )
            , cwJSON:outputJSONArray ("entries_other", $entries_mentioning )
            , cwJSON:outputJSONArray ("multimedia", $multimedia )        
            )
            , ','
        )
};



(: 
* Build the entity material components ( for a given entity URI and return a JSON result
* E.G., entires, oeuvre, multimedia, etc.)
:)
declare function local:buildEntityMaterial($query_uri_seq, $entityCModel) as xs:string?
{
  ',&#10;'
  || ' "material": {'
  ||
    (
    switch ( $entityCModel )
            case "info:fedora/cwrc:person-entityCModel" 
                return local:populateMaterialPerson($query_uri_seq)
            case "info:fedora/cwrc:organization-entityCModel"
                return local:populateMaterialOrganization($query_uri_seq)
            case "info:fedora/cwrc:place-entityCModel"
                return local:populateMaterialPlace($query_uri_seq)
            case "info:fedora/cwrc:title-entityCModel"
                return local:populateMaterialTitle($query_uri_seq)                
            default 
                return local:populateMaterialPerson($query_uri_seq) (: QUESTION: remove? :)
    )
    || "}"
};






(: ************ Assocations ******************* :)

(:
Co-mentions (associations) logic: (i.e. definition of co-mentions)
Main entity (entity for which the EAP is being built) → mentioned in the MODS datastream of an object
List all the other entities referenced in that MODS datastream
Entity mentioned in the object datastream of a CWRCDocument cModel object
If:
CWRC Document cModel object meets the criteria to be labeled as the entry associated with the main entity → list all entities referenced in that entry
Else:
→ list only the entities referenced in the same chronstruct (CWRC, orlando)/tei:event/p/tei:note/ with the main entity

:)


(: given a person URI - find co-mentions of person  - see above for general definition of "co-mention":)
declare function local:populatePersonCoMentioningPerson($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
          and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
          ]/(
              CWRC_DS//(tei:persName/@ref|NAME/@REF)
          )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:persName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:persName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//NAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::NAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given a person URI - find co-mentions of organization  - see above for general definition of "co-mention":)
declare function local:populatePersonCoMentioningOrganization($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:orgName/@ref|ORGNAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:orgName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:persName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//ORGNAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::NAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given a person URI - find co-mentions of places  - see above for general definition of "co-mention":)
declare function local:populatePersonCoMentioningPlace($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:placeName/@ref|PLACE/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:placeName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:persName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//PLACE[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::NAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
};












(: *** ORGANIZATION *** :)


(: given an organization URI - find co-mentions of person  - see above for general definition of "co-mention":)
declare function local:populateOrganizationCoMentioningPerson($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:persName/@ref|NAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:persName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:orgName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//NAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::ORGNAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given an organization URI - find co-mentions of organization  - see above for general definition of "co-mention":)
declare function local:populateOrganizationCoMentioningOrganization($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:orgName/@ref|ORGNAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:orgName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:orgName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//ORGNAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::ORGNAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given organization URI - find co-mentions of places  - see above for general definition of "co-mention":)
declare function local:populateOrganizationCoMentioningPlace($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/mods:name/@valueURI=$query_uri_seq
            or
            MODS_DS/mods:mods/mods:subject/mods:topic/@valueURI=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:name/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:placeName/@ref|PLACE/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:placeName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:orgName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//PLACE[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::ORGNAME/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
};











(: *** PLACE *** :)


(: given a place URI - find co-mentions of person  - see above for general definition of "co-mention":)
declare function local:populatePlaceCoMentioningPerson($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI/data() = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI/data() = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI/data() = $query_uri_seq
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:geograpahic/@valueURI/data() = $query_uri_seq
            ]/(
                CWRC_DS//(tei:persName/@ref|NAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:persName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:placeName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//NAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::PLACE/@REF/data()=$query_uri_seq]/@REF
                )/data()
            
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given a place URI - find co-mentions of organization  - see above for general definition of "co-mention":)
declare function local:populatePlaceCoMentioningOrganization($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:geograpahic/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:orgName/@ref|ORGNAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:orgName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:placeName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//ORGNAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::PLACE/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given organization URI - find co-mentions of places  - see above for general definition of "co-mention":)
declare function local:populatePlaceCoMentioningPlace($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq
            or 
            MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI = $query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and MODS_DS/mods:mods/mods:subject/mods:geograpahic/@valueURI = $query_uri_seq
            ]/(
                CWRC_DS//(tei:placeName/@ref|PLACE/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:placeName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:placeName/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//PLACE[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::PLACE/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
};














(: *** TITLE *** :)

(: given a title URI - find co-mentions of person  - see above for general definition of "co-mention":)
declare function local:populateTitleCoMentioningPerson($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            @pid/data()=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and @pid/data()=$query_uri_seq
            ]/(
                CWRC_DS//(tei:persName/@ref|NAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:persName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:title/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//NAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::TITLE/@REF/data()=$query_uri_seq]/@REF
                |
                CWRC_DS//tei:persName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:note/bibl/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//NAME[(ancestor::CHRONSTRUCT|ancestor::P)/(descendant::BIBCIT|descendant::TEXTSCOPE)/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given a title URI - find co-mentions of organization  - see above for general definition of "co-mention":)
declare function local:populateTitleCoMentioningOrganization($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            @pid/data()=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:name|mods:topic)/@valueURI[data()!=$query_uri_seq]
                |
                MODS_DS/mods:mods/name/@valueURI[data()!=$query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:name/@valueURI[data()!=$query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and @pid/data()=$query_uri_seq
            ]/(
                CWRC_DS//(tei:orgName/@ref|ORGNAME/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:orgName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:title/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//ORGNAME[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::TITLE/@REF/data()=$query_uri_seq]/@REF
                |
                CWRC_DS//tei:orgName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:note/tei:bibl/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//ORGNAME[(ancestor::CHRONSTRUCT|ancestor::P)/(descendant::BIBCIT|descendant::TEXTSCOPE)/@REF/data()=$query_uri_seq]/@REF                
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
        
};

(: given a title URI - find co-mentions of places  - see above for general definition of "co-mention":)
declare function local:populateTitleCoMentioningPlace($query_uri_seq)
{
    let $uris_mods :=
        cwAccessibility:queryAccessControl(fn:collection())[
            @pid/data()=$query_uri_seq 
            ]/(
                MODS_DS/mods:mods/mods:subject/(mods:geographic|mods:topic)/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
                | 
                MODS_DS/mods:mods/mods:relatedItem/mods:originInfo/place/placeTerm/@valueURI[data() = $query_uri_seq]
            )/data()
    let $uris_entries_about :=
        cwAccessibility:queryAccessControl(fn:collection())[
            RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()="info:fedora/cwrc:documentCModel" 
            (: and MODS_DS/mods:mods/mods:genre/text() = ("Biography", "Born digital") :)
            and @pid/data()=$query_uri_seq
            ]/(
                CWRC_DS//(tei:placeName/@ref|PLACE/@REF)
            )/data()
    let $uris_entries_context :=
        cwAccessibility:queryAccessControl(fn:collection())/(
                CWRC_DS//tei:placeName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:title/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//PLACE[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::TITLE/@REF/data()=$query_uri_seq]/@REF
                |
                CWRC_DS//tei:placeName[
                    (ancestor::tei:event|ancestor::tei:note|ancestor::tei:p)/descendant::tei:note/tei:bibl/@ref/data()=$query_uri_seq
                    ]/@ref
                |
                CWRC_DS//PLACE[(ancestor::CHRONSTRUCT|ancestor::P)/descendant::TITLE/@REF/data()=$query_uri_seq]/@REF
                )/data()
      
      
    return
        ( distinct-values( ($uris_mods, $uris_entries_about, $uris_entries_context) ) )     
};





(: ***********  ********** :)


declare function local:populateAssociationsPerson($query_uri_seq) as xs:string?
{
    fn:string-join(
        (
        local:outputURISeqDetails("coMentionPerson", local:populatePersonCoMentioningPerson($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionOrganization", local:populatePersonCoMentioningOrganization($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionPlace",  local:populatePersonCoMentioningPlace($query_uri_seq) )
        )
        , ','
        )
};

declare function local:populateAssociationsOrganization($query_uri_seq) as xs:string?
{
    fn:string-join(
        (
        local:outputURISeqDetails("coMentionPerson", local:populateOrganizationCoMentioningPerson($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionOrganization", local:populateOrganizationCoMentioningOrganization($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionPlace",  local:populateOrganizationCoMentioningPlace($query_uri_seq) )
        )
        , ','
        )
};

declare function local:populateAssociationsPlace($query_uri_seq) as xs:string?
{
    fn:string-join(
        (
        local:outputURISeqDetails("coMentionPerson", local:populatePlaceCoMentioningPerson($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionOrganization", local:populatePlaceCoMentioningOrganization($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionPlace",  local:populatePlaceCoMentioningPlace($query_uri_seq) )
        )
        , ','
        )
};

declare function local:populateAssociationsTitle($query_uri_seq) as xs:string?
{
    fn:string-join(
        (
        local:outputURISeqDetails("coMentionPerson", local:populateTitleCoMentioningPerson($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionOrganization", local:populateTitleCoMentioningOrganization($query_uri_seq)  )
        , local:outputURISeqDetails("coMentionPlace",  local:populateTitleCoMentioningPlace($query_uri_seq) )
        )
        , ','
        )
};



(: 
* Build the entity association components ( for a given entity URI and return a JSON result
* E.G., entires, oeuvre, multimedia, etc.)
:)
declare function local:buildEntityAssociations($query_uri_seq, $entityCModel) as xs:string?
{
  ',&#10;'
  || ' "connections": {'
  ||
    (
        switch ( $entityCModel )
            case "info:fedora/cwrc:person-entityCModel" 
                return local:populateAssociationsPerson($query_uri_seq)
            case "info:fedora/cwrc:organization-entityCModel"
                return local:populateAssociationsOrganization($query_uri_seq)
            case "info:fedora/cwrc:place-entityCModel"
                return local:populateAssociationsPlace($query_uri_seq)
            case "info:fedora/cwrc:title-entityCModel"
                return local:populateAssociationsTitle($query_uri_seq) 
            default 
                return local:populateAssociationsPerson($query_uri_seq) (: QUESTION: remove? :)
    )
  || "}"
             
};


(: 
* build a sequences of "sameAs" PID for a given initial entity
* by tranversing the graph of sameAs relationships
* and assuming not all entities will have a complete list
* of the sameAs relationship and the relationship graph might be 
* cyclical
*
* https://en.wikibooks.org/wiki/XQuery/Sequences
* http://maxdewpoint.blogspot.ca/2011/11/xquerys-union-intersect-and-except.html
:)

declare function local:sameAsRecursive($inputSeq as xs:string+, $traversedSeq) 
{
  let $inputNodes := fn:collection()/obj[@pid=$inputSeq]/@pid/data()
  
  (: traverse incomming and outdoing links to/from the input set :)
  let $newSeq := 
    fn:distinct-values(
      (
        fn:collection()/obj[descendant::sameAs=$inputSeq]/@pid/data()
        ,
        fn:collection()/obj[@pid=$inputSeq]//sameAs/text()
      )
    )
  (: remove the graph nodes not previously seen from the set :)
  let $notSeenSeq := $newSeq[not(.=$traversedSeq)]
  (: update the set of traversed nodes :)
  let $traversedSeq := ($traversedSeq, $inputSeq)
    
  return
    (: doesn't do a deep-equal just tests if at least one member is present in both sequences:)
    (: if ( ($tmpSeq, $newSeq) != $traversedSeq ) then :)

    (: if there are not previously traversed node, then recursively traverse :)    
    (: else return the traversed set:)
    if ( count($notSeenSeq)>0 ) then
      local:sameAsRecursive($newSeq,$traversedSeq)
    else
      $traversedSeq
};



(: 
* Main functions  
:)

let $uri_source := local:getEntitySource($ENTITY_URI)
    
(: given a URI, find the PID to use for the profile detials :)
(: zap trailing '/' in the uri :)
(: ToDo: set exteranl entity stub detection in the default case :)
let $query_pid := 
    switch ($uri_source)
        case $ENTITY_SOURCE_CWRC
            return 
                ( tokenize(replace($ENTITY_URI,'/$',''),'/')[last()] )
        default
            return
                (
                (/obj[(PERSON_DS|ORGANIZATION_DS|PLACE_DS)/entity/(person|organization|place)/recordInfo/entityId/text()=$ENTITY_URI])/@pid 
                |
                /obj[MODS_DS/mods:mods[mods:recordInfo/mods:recordContentSource='VIAF']/mods:identifier/text()=$ENTITY_URI]/@pid 
                )[1]/data() (: use position to limit to only one in the event of a duplicate :)
        
let $entityObj := cwAccessibility:queryAccessControl(/)[@pid=$query_pid]
let $entityCModel := $entityObj/RELS-EXT_DS/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource/data()

(: lookup the "sameAs" linked data:)
(: let $entity_uri_set := local:sameAsRecursive( ('islandora:52663f0e-6e77-44b1-be3b-c23b70018ce2'),() ) :)
(: ToDo:
* 2016-05-17
* if start with a CWRC Commons URI (e.g., http://commons.cwrc.ca/cwrc:4fa02835-34b1-4c27-bfa4-9cf978d77331
* then the sameAs doesn't get populated by "local:sameAsRecursive"
* because commons.cwrc.ca/{PID} is not stored within the entity object
* this temporary kludge uses the PID to help populate teh sameAs set
* :)
let $entity_uri_set := 
  if ($uri_source = $ENTITY_SOURCE_CWRC) then
    (local:sameAsRecursive( ($ENTITY_URI,$query_pid),() ))
  else
    (local:sameAsRecursive( ($ENTITY_URI),() ))
  
return

try{
  (
    '{&#10;'
    ,
    cwJSON:outputJSON("query_URI", $ENTITY_URI) 
    ,
    ',' || cwJSON:outputJSON("query_pid", $query_pid) 
    ,
    ',' || cwJSON:outputJSON("LODSource", $uri_source) 
    ,
    ',' || cwJSON:outputJSON("cModel", $entityCModel) 
    ,
    ',' || cwJSON:outputJSONArray("same_as", $entity_uri_set) 
    ,
    local:buildEntityProfile($entityObj,$entityCModel)
    ,
    local:buildEntityMaterial($entity_uri_set, $entityCModel)
    ,
    local:buildEntityAssociations($entity_uri_set, $entityCModel)
    ,
  '&#10;}'
  )
}
catch *
{
    '{"error":"'|| $err:code || ' - ' || $err:description || '"}'
}

