var assert      = require("assert");
var _           = require("underscore");
var proxyLoader = require("simple-proxies/lib/proxyfileloader");
var scraper     = require("../index.js");



describe('Test Scrape with proxy', function() {

        var proxyList = null;

        before(function(done) {
              this.timeout(100000);
              console.log("Loading proxies ...");
              proxyLoader.loadDefaultProxies(function(error, pl){
                  console.log("Number of loaded proxies : " + pl.getProxies().length);
                  proxyList = pl;
                  if (pl.getProxies().length === 0) {
                    return done(new Error("No proxy loaded"));
                  }
                  done();
              });

        });


        it.skip('Sould Scrape a couple of pages on infobel via proxies', function(done) {
            this.timeout(400000);
            var options = {
               urls : ["http://www.infobel.com/fr/belgium/business/120400/societe_de_credit",
                       //"http://www.infobel.com/fr/belgium/business/120200/assurance",
                       //"http://www.infobel.com/fr/belgium/business/120600/legal_et_financier_investissements"
                     ],
               jar : true,
               proxyList : proxyList
            };

            scraper.scrape(options, scrapePage, nextPageUrl, function(error, results){
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
