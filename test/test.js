var assert  = require("assert");
var scraper = require("../index.js");
var _       = require("underscore");


//http://www.habitations.be/les-bonnes-adresses/societe-de-credit.html

describe('Test Scrape', function() {


        it('Sould Scrape a couple of pages on infobel', function(done) {
            this.timeout(400000);
            var options = {
               urls : ["http://www.infobel.com/fr/belgium/business/120400/societe_de_credit",
                       "http://www.infobel.com/fr/belgium/business/120200/assurance",
                       "http://www.infobel.com/fr/belgium/business/120600/legal_et_financier_investissements"],
               jar : true,
               scrapePage : scrapePage,
               nextPageUrl : nextPageUrl
            };

            scraper.scrape(options, function(error, results){
                  if (error) {
                    console.log(error);
                  }
                  assert(! error);
                  var list = _.uniq(_.compact( _.flatten(results)));
                  console.log("End of scrape", list);

                  done();
            });

        });
});

function scrapePage(url, $, callback) {
    console.log("Scrape Page", url);
    var links = [];

     $('.detail-text').filter(function() {
        return $(this).text().trim() === 'Site internet';
      }).each(function(i, span) {
        links.push($(this).parent().attr("href"));

      });

    callback(null, links);
}


function nextPageUrl(url, $, callback) {
  var link = $('.sr-only').filter(function() {
     return $(this).text().trim() === 'Next';
   }).parent().attr("href");

   callback(null, "http://www.infobel.com" + link);
}
