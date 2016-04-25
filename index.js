var request = require("request");
var async   = require("async");
var cheerio = require('cheerio');
var _       = require("underscore");
var log     = require('crawler-ninja-logger').Logger;


function scrape(options, scrapePage, nextPageUrl, callback){
    var DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1';
    var scrapePagefn = scrapePage;
    var nextPageUrlfn  = nextPageUrl;

    start(options, scrapePage, nextPageUrl, callback);

    /**
     * Scrape pages on a website
     * @param options used to scrape de site :
     *  - headers : the usual http request to use (based on the nodejs request module)
     *  - delay : delay between each http request in ms (optional)
     *  - proxyList : a list of proxies to used (based on the nodejs simple-proxies module)
     *  - scrapePage : the function to call in order to scrap the page : function scrapePage(url, $, callback)
     *  - nextPageUrl : the funciton to call in order to retrieve the next page link :  function nextPageUrl(url, $, callback)
     *
     * @param callback(error, allLinks) // result : the allLinks produice by the scrapePage function
     */
    function start(options, scrapePage, nextPageUrl, callback) {

      async.waterfall([
          async.apply(init, options),
          function(options, callback) {
              httpRequests(options, callback);
          }],
          callback
      );
    }


    /**
     *  Check the search options
     *
     * @param the options to check
     * @callback(error, options)
     */
    function init(options, callback) {
        if ( ! options.urls) {
          return callback(new Error("No urls attribute in the options"));
        }

        options.headers = (options.headers || {});

        if ( ! options.headers["User-Agent"]) {
          options.headers["User-Agent"] = DEFAULT_USER_AGENT;
        }
        callback(null, options);
    }

    /**
     * Scrape all pages defined in the options
     *
     *
     * @param
     * @callback
     */
    function httpRequests(options, callback) {

          async.each(options.urls,
              function(url,callback) {

                var urlOptions = _.clone(options);
                urlOptions.url = url;
                //urlOptions.headers = options.headers;
                httpRequest(urlOptions, callback);
              },
              callback
          );
    }

    /**
     *  Execute a request on the website
     *  This function can called recursivly in order to get multiple result pages
     *  in function of the options.nextPage
     *
     * @param the search options
     * @param the already found links
     * @callback(error, links)
     */
    function httpRequest(options, callback) {

        if (options.delay) {
           //console.log("Wait between request : " + options.delay);
           setTimeout(execRequest, options.delay, options, callback);
        }
        else {
           execRequest(options, callback);
        }
    }

    function execRequest(options, callback) {
        // Proxy rotation
        if(options.proxyList) {
          options.proxy = options.proxyList.pick().getUrl();
        }

        logInfo("Http Request",  options.url, options);
        request(options, function(error, response, body){
              checkPage(options, error, response, body, callback);
        });
    }


    function checkPage(options, error, response, body, callback) {

            if (error) {
              logError("Error during request", options.url, options, error);
              return callback();
            }

            if (response.statusCode !== 200) {
              logError("Invalid HTTP code : " + response.statusCode, options.url, options);
              return callback();
            }

            var $ = cheerio.load(body);

            scrapePagefn(options.url, $, function(error) {
                if (error) {
                    logError("Error during scraping the page", options.url, options, error);
                }
                scrapeNextPage(options, $, callback);
            });

    }

    function scrapeNextPage(options, $, callback) {
      if (nextPageUrlfn) {
        nextPageUrlfn(options.url, $, function(error, pageUrl) {
          if (error) {
            logError("Error when trying to find the nextpage", options.url, options, error);
            return callback();
          }
          if (pageUrl) {
              var nextPageOptions = _.clone(options);
              if (options.proxyList) {
                nextPageOptions.proxyList = options.proxyList;
                nextPageOptions.proxy = null;
              }
              nextPageOptions.url = pageUrl;
              return execRequest(nextPageOptions, callback);

          }
          else {
            logInfo("no next page to scrape", options.url, options);
            callback();
          }
        });
      }
      else {
        logInfo("no next page function", options.url, options);
        return callback();
      }
    }

    function logInfo(message, url, options) {
      log.info({module : "simple-scraper", message : message, url : url, options : options});
    }

    function logError(message, url, options, error) {
      log.error({module : "simple-scraper", message : message, url : url , error : error, options: options});
    }

}

module.exports.scrape = scrape;
