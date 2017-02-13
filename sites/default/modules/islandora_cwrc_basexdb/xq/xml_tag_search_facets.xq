(: 
*
* Provide a list of faceted elements based on the context of the
* results from the XQuery based full-text search with the ability 
* to limit the elements in which the text is searched 
*
* Return a list of bin identifiers representing the facets and thier counts
* 
*
* test:
*   from XML database client
*   set querypath "http://cwrc-dev-01.srv.ualberta.ca/sites/all/modules/islandora_cwrc_basexdb/xq/"
*   open cwrc_main
*   
:)


xquery version "3.0" encoding "utf-8";

import module namespace cwAccessibility="cwAccessibility" at "./islandora_access_control.xq";


declare namespace output = "http://www.w3.org/2010/xslt-xquery-serialization";
declare option output:method "json";
declare option output:encoding "UTF-8";
declare option output:indent   "no";

(: parameters passed into the query :)
declare variable $BASE_URL external := "";
declare variable $MARK_NAME := "zzzMARKzzz"; (: search hit marker :)
declare variable $QRY_FACETS external := (); (: e.g. ('P','DIV0') :)
declare variable $QRY_ELEMENTS external := (); (: e.g. ('P','DIV0') :)
declare variable $QRY_TERMS external := "{'Pauline', 'Pauline'}"; (: e.g. "Saturday", "Night" :)
declare variable $config_map external := ""; (: e.g. "Saturday", "Night" :)

(:
* for a given object $obj determine the XPath components for each hit
* defined by an introduced XML element by the XQuery search named $MARK_NAME
* and add each component of the path to a map data structure. 
* The resulting sequenc data structure built based on the binning rules
* defined in the $config_map - i.e. how multiple elements are combined
* into one bin e.g. like a histogram. 
* If a bin occurs at least once in the object then it is added to the sequence
* once.
:)

(: add in the limit for context - $QRY_FACETS :)
(: ToDo: prevent going farther down the tree than the passed in elements when determine facets :)
(: do not return all ancestors - avoid the "obj" element - ancestor::*[not(last()-position()<2) 
:)

declare function local:getDocBinsAsSequence($obj, $config_map, $qry_facets_seq, $qry_elements_seq, $MARK_NAME)
{
  for $elm in $obj//*[name()=$qry_elements_seq or not($qry_elements_seq)]//*[name()=$qry_facets_seq or empty($qry_facets_seq)]//*[name()=$MARK_NAME]/ancestor::*[not(last()-position()<2)]/node-name()
    let $bin :=
      if ($config_map and map:contains($config_map, $elm)) then
        (: put value in bin defined by the $config_map :)
        map:get($config_map, $elm)
      else
        (: put value in bin defined by the element name:)
        $elm
    group by $bin
    return
      $bin
};

(: the main section: :)

let $qry_terms_str := $QRY_TERMS

(: not sure how to write in a better way without the repetition :)
(: * note: mark are added based on the context not on the XPath within
the predicate
 
 xquery ft:mark((obj[.//STANDARD//text() contains text {'Pauline'} all words using stemming using diacritics insensitive window 6 sentences]) )//mark[ancestor::STANDARD]/ancestor::*/fn:node-name()
:)
(: 
* facet_elements are added via the facets selected at the current state 
* query_elements are elements defined outside of the current facet selection
*   these with be ancestors of the current hits may overlap with facet_elements
:)

(: the main section: :)
let $qry_terms_str := $QRY_TERMS
(:
  * assume input in the form ELEMENT,ELEMENT e.g. WRITING,STANDARD
  * passing in "('WRITING')" within the map data struct left the type
  * as a string as opposed to a sequence e.g. xs:string()* See the difference
  * in the two following methods
  *   let $qry_facets_seq as item()* := "('WRITING')"
  *   let $qry_facets_seq as item()* := ('WRITING')
  * a more advanced method
  *   http://www.oxygenxml.com/archives/xsl-list/200702/msg00629.html
  *   http://www.xqueryfunctions.com/xq/fn_tokenize.html
 :)
let $qry_facets_seq as item()* := fn:tokenize($QRY_FACETS,',')
let $qry_elements_seq as item()* := fn:tokenize($QRY_ELEMENTS,',')



(: query needs to be equivalent to the xml_tag_search.xq equivalent :)
let $qry :=
  if ( empty($qry_elements_seq) and empty($qry_facets_seq) ) then
    ft:mark(cwAccessibility:queryAccessControl(/)[.//text() contains text {$qry_terms_str} all words using stemming using diacritics insensitive window 6 sentences], $MARK_NAME)
  else if ( not(empty($qry_elements_seq)) and empty($qry_facets_seq) ) then
    ft:mark(cwAccessibility:queryAccessControl(/)[.//*[name()=$qry_elements_seq]//text() contains text {$qry_terms_str} all words using stemming using diacritics insensitive window 6 sentences], $MARK_NAME)
  else if ( empty($qry_elements_seq) and not(empty($qry_facets_seq)) ) then
    ft:mark(cwAccessibility:queryAccessControl(/)[.//*[name()=$qry_facets_seq]//text() contains text {$qry_terms_str} all words using stemming using diacritics insensitive window 6 sentences], $MARK_NAME)
  else
    ft:mark(cwAccessibility:queryAccessControl(/)[.//*[name()=$qry_elements_seq]//*[name()=$qry_facets_seq]//text() contains text {$qry_terms_str} all words using stemming using diacritics insensitive window 6 sentences], $MARK_NAME)


(: for each object :)
let $bin_seq :=
  for $obj in $qry
  return
    local:getDocBinsAsSequence($obj, $config_map, $qry_facets_seq, $qry_elements_seq, $MARK_NAME)
(:
    $obj//*[name()=$MARK_NAME]/../name()
    $obj/@pid
:)

(: 
* given a sequence of sequences use group by to elimiate duplicates and count
* instances
 :)
(: 
  * ToDo: prevent addition of the last ',' group by does 
  * weird things if use $bin[position()=1] as the first
  * may not be in the first position after the grouping
  * Could wrap with
  * fn:string-join(for..., ",")
:)

return
  (
  '{'
  ,
  let $retSeq := 
    for $bin at $posn in ($bin_seq) 
      let $tmp := $bin 
      group by $tmp
      (: 
        return element { "x" } { $tmp }
        return element { $tmp } { count($bin) } 
      :)
      return
        ('"' || $tmp || '" : "' || count($bin) || '"')
  return
    fn:string-join($retSeq, ',')
  ,
  '}'
  )



