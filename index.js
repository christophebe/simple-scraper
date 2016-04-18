var request = require("request");
var async   = require("async");
var cheerio = require('cheerio');
var _       = require("underscore");
var log     = require('crawler-ninja-logger').Logger;

var DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1';


/**
 * Scrape pages on a website
 * @param the options used to make the google search, based on the following structure :
 *  var options : {
 *      url : "http://....",  // the url from which we start the scrape
 *      scrapePage : function(htlm, callback),  //the function called when the scrape load a page
 *      nextPage : " ",  // The cheerio expression used to load the next pages to scrap
 *      delay : 1000 // The delay to used between each requests (in ms)
 *      // If needed, add all request options like proxy : https://github.com/request/request
 * }
 *
 *
 * @param callback(error, allLinks) // result : the allLinks produice by the scrapePage function
 */
function scrape(options, callback) {

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

    var hasUserAgent = (options.headers || {})["User-Agent"];

    if ( ! hasUserAgent) {
      options.headers = (options.headers || {});
      options.headers["User-Agent"] = DEFAULT_USER_AGENT;
    }
    callback(null, options);
}

/**
 *
 *
 *
 * @param
 * @callback
 */
function httpRequests(options, callback) {

      async.map(options.urls,
          function(url,callback) {

            var urlOptions = _.pick(options, 'headers', 'proxy', 'delay', 'jar');
            urlOptions.url = url;
            urlOptions.headers = options.headers;
            urlOptions.scrapePage = options.scrapePage;
            urlOptions.nextPageUrl = options.nextPageUrl;

            httpRequest(urlOptions, [], callback);
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
function httpRequest(options, allLinks, callback) {

    // Proxy rotation
    if(options.proxyList  && ! options.proxy ) {
      options.proxy = options.proxyList.getProxy().getUrl();
    }

    if (options.delay) {
       //console.log("Wait between request : " + options.delay);
       setTimeout(execRequest, options.delay, options, allLinks, callback);
    }
    else {
       execRequest(options, allLinks, callback);
    }
}

function execRequest(options, allLinks, callback) {
    logInfo("Http Request",  options.url, options);
    request(options, function(error, response, body){
          checkPage(options, error, response, body, allLinks, callback);
    });
}


function checkPage(options, error, response, body, allLinks, callback) {

        if (error) {
          logError("Error during request", options.url, options, error);
          return callback(null, allLinks);
        }

        if (response.statusCode !== 200) {
          logError("Invalid HTTP code : " + response.statusCode, options.url, options);
          return callback(null, allLinks);
        }

        var $ = cheerio.load(body);

        options.scrapePage(options.url, $, function(error, links){
          allLinks = allLinks.concat(links);
          scrapeNextPage(options, allLinks, $, callback);
        });

}

function scrapeNextPage(options, allLinks, $, callback) {
  if (options.nextPageUrl) {
    options.nextPageUrl(options.url, $, function(error, pageUrl) {
      if (pageUrl) {
          var nextPageOptions = _.pick(options, 'headers', 'proxy', 'delay', 'jar');
          if (options.proxyList) {
            nextPageOptions.proxyList = options.proxyList;
            nextPageOptions.proxy = null;
          }
          nextPageOptions.scrapePage = options.scrapePage;
          nextPageOptions.nextPageUrl = options.nextPageUrl;

          nextPageOptions.url = pageUrl;
          return execRequest(nextPageOptions, allLinks, callback);

      }
      else {
        logInfo("no next page to scrape", options.url, options);
        callback(null, allLinks);
      }
    });
  }
  else {
    logInfo("no next page function", options.url, options);
    return callback(null, allLinks);
  }
}

function logInfo(message, url, options) {
  log.info({module : "simple-scraper", message : message, url : url, options : options});
}

function logError(message, url, options, error) {
  log.error({module : "simple-scraper", message : message, url : url , error : error, options});
}


module.exports.scrape = scrape;
