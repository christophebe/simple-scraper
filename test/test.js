var assert  = require("assert");
var async   = require("async");
var _       = require("underscore");
var request = require("request");
var cheerio = require("cheerio");
var scraper = require("../index.js");

var URL_CREDIT = "societe-de-credit";

var links = [];
describe('Test Scrape', function() {



        it('Sould Scrape a couple of pages on habitations.be', function(done) {
            this.timeout(400000);
            var options = {
               /*urls : ["http://www.infobel.com/fr/belgium/business/120400/societe_de_credit",
                       //"http://www.infobel.com/fr/belgium/business/120200/assurance",
                       //"http://www.infobel.com/fr/belgium/business/120600/legal_et_financier_investissements"
                     ],*/
                urls : [     "http://www.habitations.be/les-bonnes-adresses/societe-de-credit.html",
                             //"http://www.habitations.be/les-bonnes-adresses/assurance.html",
                             //"http://www.habitations.be/les-bonnes-adresses/notaires.html",
                             //"http://www.habitations.be/les-bonnes-adresses/experts-immobiliers.html",
                             //"http://www.habitations.be/les-bonnes-adresses/agences-immobilieres.html"
                           ],
               jar : true
            };

            scraper.scrape(options, scrapePage, nextPageUrl, function(error, results){
                  if (error) {
                    console.log(error);
                  }
                  assert(! error);
                  var list = _.uniq(_.compact( _.flatten(results)));
                  console.log("End of scrape", links);

                  done();
            });

        });
});

function scrapePage(url, $, callback) {
    console.log("Scrape Page", url);

    var detailPages = [];

    $(".sobi2Listing a").each(function(i, a){
        detailPages.push($(a).attr('href'));
    });

    detailPages = _.filter(_.uniq(_.compact(detailPages)), function(url){return url.indexOf(URL_CREDIT);});

    async.each(detailPages, function(detailPage, callback) {
        getDetailPage(detailPage, function(error, externalSite) {
          if (externalSite) {
            links.push(externalSite);
          }
          callback();
        });
    },
    function(error){
      callback(null, links);
    });
}

function getDetailPage(link, callback) {
    //console.log("getDetailPage" , link);
    request(link, function(error, response, body){
        if (error) {
          console.log("Error", error);
          return callback();
        }

        if (response.statusCode !== 200) {
          return callback();
        }

        var $ = cheerio.load(body);
        var a = $('a').filter(function() {
           return $(this).text().trim() === 'Site internet';
         });

        callback(null, $(a).attr('href'));
    });


}

function nextPageUrl(url, $, callback) {
    var link = $('.pagenav').filter(function() {
       return $(this).text().trim() === 'Suivant';
     });

     callback(null, "http://www.habitations.be" + $(link).attr("href") );
}
