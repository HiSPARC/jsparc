/**
* @license
*
* Regression.JS - Regression functions for javascript
* http://tom-alexander.github.com/regression-js/
*
* copyright(c) 2013 Tom Alexander
* Licensed under the MIT license.
*
**/
// The code is adapted and supplemented for the HiSPARC purposes.

;(function() {
    'use strict';

    var gaussianElimination = function(a, o) {
        var n = a.length - 1,
            x = new Array(o),
            i, j, k, tmp;
        for (i = 0; i < n; i++) {
            var maxrow = i;
            for (j = i + 1; j < n; j++) {
                if (Math.abs(a[i][j]) > Math.abs(a[i][maxrow])) {
                    maxrow = j;}}
            for (k = i; k < n + 1; k++) {
                tmp = a[k][i];
                a[k][i] = a[k][maxrow];
                a[k][maxrow] = tmp;}
            for (j = i + 1; j < n; j++) {
                for (k = n; k >= i; k--) {
                    a[k][j] -= a[k][i] * a[i][j] / a[i][i];}}}
        for (j = n - 1; j >= 0; j--) {
            tmp = 0;
            for (k = j + 1; k < n; k++) {
                tmp += a[k][j] * x[k];}
            x[j] = (a[n][j] - tmp) / a[j][j];}
        return x;
    };

    var prepare_for_MathJax = function(string) {
        // Prepare the formula string for MathJax, LaTeX style formula.
        // Add $$ before and after string, replace 'e' notation with '10^'
        // and remove redundant '+' in case it is directly followed by '-'.
        return '\\(' + string.replace(/e\+?(-?\d+)/g,'\\cdot10^{$1}')
                            .replace(/\+ -/g, '-') + '\\)';
    };

    var methods = {
        linear: function(data) {

            // Linear regression. For instance, see
            // http://mathworld.wolfram.com/LeastSquaresFitting.html
            // To fit y = A + Bx the function Sum((A + Bx - y)^2) is mimimized.
            // Correlation coefficient r. For instance, see
            // http://mathworld.wolfram.com/CorrelationCoefficient.html
            // Correlation is calculated between (x, y) of the data and
            // (x, y) of the regression function.

            var sum = [0, 0, 0, 0, 0, 0],
                x, y, i,
                results = [];

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = data[i][1];
                sum[0] += x;
                sum[1] += y;
                sum[2] += x * x;
                sum[3] += x * y;
                sum[4] += y * y;
                sum[5] += 1;}

            var n = sum[5];
            var denominator = (n * sum[2] - sum[0] * sum[0]);
            var A = (sum[1] * sum[2] - sum[0] * sum[3]) / denominator;
            var B = (n * sum[3] - sum[0] * sum[1]) / denominator;

            var ssxx = sum[2] - sum[0] * sum[0] / n;
            var ssxy = sum[3] - sum[0] * sum[1] / n;
            var ssyy = sum[4] - sum[1] * sum[1] / n;

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                var yf = A + B * x;
                var coordinate = [x, yf];
                results.push(coordinate);}

            var corr = ssxy / Math.sqrt(ssxx * ssyy);
            var corrstring = 'r = ' + corr.toFixed(3);
            var string = 'y = ' + B.toExponential(2) + 'x + ' +
                         A.toExponential(2);

            return {equation: [B, A], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        gaussian: function(data) {

            // Gaussian regression. From the relative cumulative
            // distribution Y the z value is obtained as the real root
            // of the cubic z^3 + (1.5976/0.07056)z - (1/0.07056)ln (Y/(1-Y))
            // The relation between Y and z is from Bowling et al.,
            // JIEM, p 114-127 (2009). To fit z with the linear
            // relation A + Bx the function Sum((A + Bx - z)^2) is
            // mimimized for the range -1.4 < z < 1.4. Correlation
            // coefficient is calculated according to r^2 = 1 - SSE/SST,
            // where SSE is the sum of the squared deviations of y-data
            // with respect to y-regression and where SST is the sum of
            // the deviations of y-data with respect to the mean of
            // y-data.

            var n, i, yf;
            var cleandata = [], sumdata = [];
            for (n = 0; n < data.length; n++) {
                if (!isNaN(data[n][1])){
                    cleandata.push([data[n][0], data[n][1]]);
                    sumdata.push([data[n][0], data[n][1]]);}}

            for (n = 0; n < cleandata.length - 1; n++) {
                var oldsum = sumdata[n][1];
                sumdata[n+1][1] = cleandata[n+1][1] + oldsum;}

            var max = sumdata[cleandata.length - 1][1];
            var width = sumdata[cleandata.length - 1][0] - sumdata[0][0];
            var reldata = [];
            for (n = 0; n < cleandata.length ; n++) {
                reldata.push([sumdata[n][0], sumdata[n][1] / max]);}

            var sum = [0, 0, 0, 0, 0, 0], x = 0, y = 0, results = [];
            var p = 22.64172356, q = 0, psi = 0, root2 = 0, root3 = 0, z = 0;
            for (n = 0; n < reldata.length ; n++) {
                psi = reldata[n][1];
                q = -14.1723356 * Math.log(psi/(1 - psi));
                root2 = Math.sqrt(q * q / 4 + p * p * p / 27);
                root3 = Math.pow((root2 - q / 2), 1 / 3);
                z = root3 - p / (3 * root3);
                if (z < 1.4 && z > -1.4) {
                    x = reldata[n][0];
                    sum[0] += x;
                    sum[1] += z;
                    sum[2] += x * x;
                    sum[3] += x * z;
                    sum[4] += z * z;
                    sum[5] += 1;}}

            n = sum[5];
            var denominator = (n * sum[2] - sum[0] * sum[0]);
            var A = (sum[1] * sum[2] - sum[0] * sum[3]) / denominator;
            var B = (n * sum[3] - sum[0] * sum[1]) / denominator;

            var SSE = 0, SST = 0;
            var mu = - A / B;
            var sigma = 1 / B;
            var norm = max * width / reldata.length * 0.3989423 * B;
            var yg = max / reldata.length;
            for (i = 0; i < cleandata.length; i++) {
                x = cleandata[i][0];
                y = cleandata[i][1];
                yf = norm * Math.exp(-0.5 * (A + B * x) * (A + B * x));
                SSE += (y - yf) * (y - yf);
                SST += (y - yg) * (y - yg);}

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                yf = norm * Math.exp(-0.5 * (A + B * x) * (A + B * x));
                var coordinate = [x, yf];
                results.push(coordinate);}

            var corr = Math.sqrt(1 - SSE / SST) * Math.sqrt(1 - SSE / SST);
            var corrstring = 'r^2 = ' + corr.toFixed(3);
            var string = 'y = ' + norm.toExponential(2) +
                         '\\cdot e^{-\\frac{1}{2} \\left( \\frac{x - ' +
                         mu.toExponential(2) + '}{' + sigma.toExponential(2) +
                         '}\\right)^2}';

            return {equation: [mu, sigma], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        sine: function(data, period) {

            // Sine regression. With a guessed value for the period p
            // the function Sum((A*sin(2*pi*x/p + c) - y*)^2) is
            // mimimized, where y* = y - <y>. Correlation coefficient is
            // calculated according to r^2 = 1 - SSE/SST, where SSE is
            // the sum of the squared deviations of y-data with respect
            // to y-regression and where SST is the sum of the
            // deviations of y-data with respect to the mean of y-data.

            if (typeof period === 'undefined') {
                period = data[data.length - 1][0] - data[0][0];}

            var sum = [0, 0, 0, 0, 0, 0, 0, 0, 0],
                b = 2 * Math.PI / period,
                x, bx, y, yf, i, n, cos, sin,
                results = [];

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = data[i][1];
                bx = b * x;
                cos = Math.cos(bx);
                sin = Math.sin(bx);
                sum[0] += cos * cos;
                sum[1] += cos * sin;
                sum[2] += sin * sin;
                sum[3] += y * cos;
                sum[4] += y * sin;
                sum[5] += 1;
                sum[6] += cos;
                sum[7] += sin;
                sum[8] += y;}

            n = sum[5];
            var termss = sum[2] - sum[7] * sum[7] / n;
            var termsc = sum[1] - sum[6] * sum[7] / n;
            var termcc = sum[0] - sum[6] * sum[6] / n;
            var termys = sum[4] - sum[8] * sum[7] / n;
            var termyc = sum[3] - sum[8] * sum[6] / n;

            var termA = termcc * termys - termsc * termyc;
            var termB = termss * termyc - termsc * termys;
            var termC = termss * termcc - termsc * termsc;

            var sqAB = termA * termA + termB * termB;
            var sqB = termB * termB;
            var ratio = sqB / sqAB;
            var a = Math.sqrt(sqAB * sqB) / termC / termB;
            var c = Math.atan2(ratio, ratio * termA / termB);
            if (a < 0) {
                a = - a;
                c = c + Math.PI;}
            if (c < 0) {
                c += 2 * Math.PI;}

            var SSE = 0, SST = 0;
            var d = (sum[8] - a * Math.cos(c) * sum[7] - a * Math.sin(c) * sum[6]) / n;
            var yg = sum[8] / n;
            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = data[i][1];
                yf = a * Math.sin(2 * Math.PI * x / period + c) + d;
                SSE += (y - yf) * (y - yf);
                SST += (y - yg) * (y - yg);}

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                yf = a * Math.sin(2 * Math.PI * x / period + c) + d;
                var coordinate = [x, yf];
                results.push(coordinate);}

            var corr = Math.sqrt(1 - SSE / SST) * Math.sqrt(1 - SSE / SST);
            var corrstring = 'r^2 = ' + corr.toFixed(3);
            var string = 'y = ' + a.toExponential(2) +
                         '\\cdot \\sin \\left( \\frac{2 \\pi}{' +
                         period.toExponential(2) + '} \\cdot x + ' +
                         c.toExponential(2) + ' \\right) + ' +
                         d.toExponential(2);

            return {equation: [a, c], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        exponential: function(data) {

            // Exponential regression, see
            // http://mathworld.wolfram.com/LeastSquaresFittingExponential.html
            // To fit y = A exp(Bx) --> ln y = ln A + Bx the function
            // Sum((ln A + Bx - ln y)^2) is mimimized.
            // Correlation coefficient r. For instance, see
            // http://mathworld.wolfram.com/CorrelationCoefficient.html
            // Correlation is calculated between (x, ln y) of the data and
            // (x, ln y) of the regression function.

            var sum = [0, 0, 0, 0, 0, 0],
                n, x, y, i,
                results = [];

            // y values have to be > 0
            data = data.filter(function(v) {return v[1] > 0;});

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = Math.log(data[i][1]);
                sum[0] += x;
                sum[1] += y;
                sum[2] += x * x;
                sum[3] += x * y;
                sum[4] += y * y;
                sum[5] += 1;}

            n = sum[5];
            var denominator = (n * sum[2] - sum[0] * sum[0]);
            var A = Math.exp((sum[1] * sum[2] - sum[0] * sum[3]) / denominator);
            var B = (n * sum[3] - sum[0] * sum[1]) / denominator;

            var ssxx = sum[2] - sum[0] * sum[0] / n;
            var ssxy = sum[3] - sum[0] * sum[1] / n;
            var ssyy = sum[4] - sum[1] * sum[1] / n;

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                var yf = A * Math.exp(B * x);
                var coordinate = [x, yf];
                results.push(coordinate);}

            var corr = ssxy / Math.sqrt(ssxx * ssyy);
            var corrstring = 'r = ' + corr.toFixed(3);
            var string = 'y = ' + A.toExponential(2) + 'e^{' +
                         B.toExponential(2) + 'x}';

            return {equation: [A, B], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        wexponential: function(data) {

            // Exponential regression with equally weights, see
            // http://mathworld.wolfram.com/LeastSquaresFittingExponential.html
            // To fit y = A exp(Bx) --> ln y = ln A + Bx  the function
            // Sum(y(ln A + Bx - ln y)^2) is mimimized.
            // Correlation coefficient is calculated according to
            // r^2 = 1 - SSE/SST, where SSE is the sum of the squared
            // deviations of y-data with respect to y-regression and where
            // SST is the sum of the deviations of y-data with respect to
            // the mean of y-data.

            var sum = [0, 0, 0, 0, 0, 0],
                n, x, y, lny, i,
                results = [];

            // y values have to be > 0
            data = data.filter(function(v) {return v[1] > 0;});

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = data[i][1];
                lny = Math.log(y);
                sum[0] += x;
                sum[1] += y;
                sum[2] += x * x * y;
                sum[3] += y * lny;
                sum[4] += x * y * lny;
                sum[5] += x * y;}

            var denominator = (sum[1] * sum[2] - sum[5] * sum[5]);
            var A = Math.exp((sum[2] * sum[3] - sum[5] * sum[4]) / denominator);
            var B = (sum[1] * sum[4] - sum[5] * sum[3]) / denominator;

            sum = [0, 0, 0, 0, 0, 0];

            var SSE = 0, sy = 0, syy = 0;
            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                y = data[i][1];
                sy += y;
                syy += y * y;
                sum[5] += 1;
                var yf = A * Math.exp(B * x);
                SSE += (y-yf) * (y-yf);
                var coordinate = [x, yf];
                results.push(coordinate);}

            n = sum[5];
            var SST = syy - sy * sy / n;
            var corr = Math.sqrt(1 - SSE / SST) * Math.sqrt(1 - SSE / SST);
            var corrstring = 'r^2 = ' + corr.toFixed(3);
            var string = 'y = ' + A.toExponential(2) + 'e^{' +
                         B.toExponential(2) + 'x}';

            return {equation: [A, B], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        logarithmic: function(data) {

            // Linear regression, see
            // http://mathworld.wolfram.com/LeastSquaresFittingLogarithmic.html
            // To fit y = A + B ln x the function Sum((A + B ln x - y)^2)
            // is mimimized. Correlation coefficient r. For instance, see
            // http://mathworld.wolfram.com/CorrelationCoefficient.html
            // Correlation is calculated between (ln x, y) of the data and
            // (ln x, y) of the regression function.

            var sum = [0, 0, 0, 0, 0, 0],
                n, x, y, i,
                results = [];

            // x values have to be > 0
            data = data.filter(function(v) {return v[0] > 0;});

            for (i = 0; i < data.length; i++) {
                x = Math.log(data[i][0]);
                y = data[i][1];
                sum[0] += x;
                sum[1] += y;
                sum[2] += x * x;
                sum[3] += x * y;
                sum[4] += y * y;
                sum[5] += 1;}

            n = sum[5];
            var denominator = (n * sum[2] - sum[0] * sum[0]);
            var A = (sum[1] * sum[2] - sum[0] * sum[3]) / denominator;
            var B = (n * sum[3] - sum[0] * sum[1]) / denominator;

            var ssxx = sum[2] - sum[0] * sum[0] / n;
            var ssxy = sum[3] - sum[0] * sum[1] / n;
            var ssyy = sum[4] - sum[1] * sum[1] / n;

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                if (x > 0) {
                    var yf = A + B * Math.log(x);
                    var coordinate = [x, yf];
                    results.push(coordinate);}}

            var corr = ssxy / Math.sqrt(ssxx * ssyy);
            var corrstring = 'r = ' + corr.toFixed(3);
            var string = 'y = ' + A.toExponential(2) + ' + ' +
                         B.toExponential(2) + ' ln(x)';

            return {equation: [A, B], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        power: function(data) {

            // Linear regression, see
            // http://mathworld.wolfram.com/LeastSquaresFittingPowerLaw.html
            // To fit y = A x^B  -->  ln y = ln A + B ln x the function
            // Sum((ln A + B ln x - ln y)^2) is mimimized.
            // Correlation coefficient r. For instance, see
            // http://mathworld.wolfram.com/CorrelationCoefficient.html
            // Correlation is calculated between (ln x, ln y) of the data
            // and (ln x, ln y) of the regression function.

            var sum = [0, 0, 0, 0, 0, 0],
                n, x, y, i,
                results = [];

            // both x and y values have to be > 0
            data = data.filter(function(v) {return v[0] > 0 && v[1] > 0;});

            for (i = 0; i < data.length; i++) {
                x = Math.log(data[i][0]);
                y = Math.log(data[i][1]);
                sum[0] += x;
                sum[1] += y;
                sum[2] += x * x;
                sum[3] += x * y;
                sum[4] += y * y;
                sum[5] += 1;}

            n = sum[5];
            var denominator = (n * sum[2] - sum[0] * sum[0]);
            var A = Math.exp((sum[1] * sum[2] - sum[0] * sum[3]) / denominator);
            var B = (n * sum[3] - sum[0] * sum[1]) / denominator;

            var ssxx = sum[2] - sum[0] * sum[0] / n;
            var ssxy = sum[3] - sum[0] * sum[1] / n;
            var ssyy = sum[4] - sum[1] * sum[1] / n;

            for (i = 0; i < data.length; i++) {
                x = data[i][0];
                var yf = A * Math.pow(x, B);
                var coordinate = [x, yf];
                results.push(coordinate);}

            var corr = ssxy / Math.sqrt(ssxx * ssyy);
            var corrstring = 'r = ' + corr.toFixed(3);
            var string = 'y = ' + A.toExponential(2) + ' x^{' +
                         B.toExponential(2) + '}';

            return {equation: [A, B], points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        polynomial: function(data, order) {

            // Non-linear regression, see
            // http://mathworld.wolfram.com/LeastSquaresFittingPolynomial.html
            // Correlation coefficient is calculated according to
            // r^2 = 1 - SSE/SST, where SSE is the sum of the squared
            // deviations of y-data with respect to y-regression and
            // where SST is the sum of the deviations of y-data with
            // respect to the mean of y-data.

            if (typeof order === 'undefined') {
                order = 2;}

            var a = 0, b = 0,
                i, l, j, w, answer,
                k = order + 1,
                lhs = [], rhs = [], results = [];

            for (i = 0; i < k; i++) {
                for (l = 0; l < data.length; l++) {
                    a += Math.pow(data[l][0], i) * data[l][1];}
                lhs.push(a);
                a = 0;
                var c = [];
                for (j = 0; j < k; j++) {
                    for (l = 0; l < data.length; l++) {
                        b += Math.pow(data[l][0], i + j);}
                    c.push(b);
                    b = 0;}
                rhs.push(c);}
            rhs.push(lhs);

            var equation = gaussianElimination(rhs, k);

            for (i = 0; i < data.length; i++) {
                answer = 0;
                for (w = 0; w < equation.length; w++) {
                    answer += equation[w] * Math.pow(data[i][0], w);}
                results.push([data[i][0], answer]);}

            var SSE = 0, sy = 0, syy = 0, n = 0, y = 0;
            for (i = 0; i < data.length; i++) {
                answer = 0;
                for (w = 0; w < equation.length; w++) {
                    answer += equation[w] * Math.pow(data[i][0], w);}
                y = data[i][1];
                sy += y;
                syy += y * y;
                n += 1;
                SSE += (y-answer) * (y-answer);}

            var SST = syy - sy * sy / n;
            var corr = Math.sqrt(1 - SSE / SST) * Math.sqrt(1 - SSE / SST);
            var corrstring = 'r^2 = ' + corr.toFixed(3);
            var string = 'y = ';

            for (i = equation.length - 1; i >= 0; i--) {
                if (i > 1) {
                    string += equation[i].toExponential(2) + 'x^{' + i + '} + ';}
                else if (i === 1) {
                    string += equation[i].toExponential(2) + 'x' + ' + ';}
                else {
                    string += equation[i].toExponential(2);}}

            return {equation: equation, points: results,
                    string: prepare_for_MathJax(string),
                    corrstring: prepare_for_MathJax(corrstring)};
        },


        lastvalue: function(data) {
            var results = [];
            var lastvalue = null;
            for (var i = 0; i < data.length; i++) {
                if (data[i][1]) {
                    lastvalue = data[i][1];
                    results.push([data[i][0], data[i][1]]);}
                else {
                    results.push([data[i][0], lastvalue]);}}

            return {equation: [lastvalue], points: results,
                    string: "" + lastvalue};
        }
    };

var regression = (function(method, data, order) {
    if (typeof method === 'string') {
        return methods[method](data, order);
    }});

if (typeof exports !== 'undefined') {
    module.exports = regression;}
else {
    window.regression = regression;}

}());
