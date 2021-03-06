'use strict';
/**
 * Service that returns an array of historical stock quotes
 */

angular.module('backtestMeanApp')
  .factory('HistoricalQuotesService', ['$http','$filter',function ($http,$filter) {
    var HistoricalQuotesService = {};

    /**
     * Retrieve the historical stock quotes for the specified ticker symbol and dates
     * This approach uses a REST service on the server to pass thru the quotes because
     * the Yahoo API does not support direct access from a client (does not support
     * Cross Origin Resource Sharing).
     * The other function 'getQuotesDirect' is a preferred access mehtod, but only works
     * if a CORS plugin is installed on the client which is an unacceptable security risk
     * @param ticker : ticker symbol of the stock
     * @param start : first date to collect data for
     * @param end : last date to collect data for
     * @returns {Promise} : success returns an array of stock quotes
     */
    HistoricalQuotesService.getQuotes = function(ticker, start, end){
      return new Promise(function(resolve, reject) {
        let startStr = $filter('date')(start, 'yyyy-MM-dd');
        let endStr = $filter('date')(end, 'yyyy-MM-dd');
        var url = '/api/quotes?ticker='+ticker+'&start='+startStr+'&end='+endStr;
        $http.get(url)
          .then(response => {
            let quotes = [];
            _.forEach(response.data,function(quoteSource) {
              let quote = {date: parseDate(quoteSource.date), price: Number(quoteSource.price)};
              quotes.push(quote);

            });
            if(!quotes){
               reject('ERROR: HistoricalQuotesService.getQuotes did not return any quotes for ticker '+ ticker);
            }else {
              resolve(quotes);
            }
          })
          .catch(function(err){
            reject(err.data);
          });
      });
    };

    /**
     * Retrieve the historical stock quotes for the specified ticker symbol and dates
     * This approach is not acceptable in production because it only runs with a CORS
     * plugin installed on the client which is a security risk. In the future if Yahoo or
     * another site supports accessible REST service for historical quotes then this approach
     * should be considered again.  For now this function should not be used in production.
     * @param ticker : ticker symbol of the stock
     * @param start : first date to collect data for
     * @param end : last date to collect data for
     * @returns {Promise} : success returns an array of stock quotes
     */
    HistoricalQuotesService.getQuotesDirect = function(ticker, start, end){
      return new Promise(function(resolve, reject) {
        var url = 'http://ichart.yahoo.com/table.csv?s='+ticker+'&a='+start.getMonth()+'&b='+start.getDate()+'&c='+start.getFullYear()+'&d='+end.getMonth()+'&e='+end.getDate()+'&f='+end.getFullYear();
        $http.get(url)
          .success(function (csvContents) {
            var first = true;
            var quotes = [];
            _.forEach(_.split(csvContents,'\n'),function(line) {
              // line format is: Date,Open,High,Low,Close,Volume,Adj Close
              if (!first && line.length > 10) {
                var fields = _.split(line, ',');
                var quote = {date: parseDate(fields[0]), price: Number(_.trim(fields[6]))};
                quotes.push(quote);
              }
              first = false;
            });
            _.reverse(quotes);
            resolve(quotes);
          })
          .error(function (err) {
            console.log(' HistoricalQuotesService.getQuotesDirect:err='+err);
            reject(err);
          });
      });
    };

    /**
     * Convert a date string in format 2016-01-21 into a Date object
     * in EST timezone.  This is done by adding 5 hours to the UTC Date
     * @param dateStr
     * @returns {Date}
     */
    function parseDate(dateStr){
      var dateElements = _.split(dateStr,'-');
      var year = Number(_.trim(dateElements[0]));
      var month = Number(_.trim(dateElements[1])) - 1;
      var day = Number(_.trim(dateElements[2]));
      return new Date(Date.UTC(year,month,day,5,0,0));
    }

    /**
     * A useful utility function for generating fake quotes that is useful for testing and debugging.
     * It returns a repeating triangle wave of stock prices that oscillate between 90 and 110
     * @param ticker : ticker symbol of the stock
     * @param start : first date to collect data for
     * @param end : last date to collect data for
     * @returns {Promise} : success returns an array of stock quotes
       */
    HistoricalQuotesService.getFakeQuotes = function(ticker, start, end){
      return new Promise(function(resolve, reject) {
        var quotes = [];
        let day =  new Date(start);
        day.setDate(day.getDate() - 20);
        var count = 0;
        var price = Number(100);
        var up = true;
        while (day < end) {
          quotes.push({date: day, price: price});
          if(price >= 110) {
            up = false;
          }else if(price <=90){
            up = true;
          }
          if(up){
            price++;
          }else{
            price--;
          }
          day = new Date(day);
          day.setDate(day.getDate() + 1);
          if(count > 10000){
            reject('HistoricalQuotesService.getFakeQuotes has too many days');
          }
        }
        resolve(quotes);
      });
    };

    return HistoricalQuotesService;
  }]);



