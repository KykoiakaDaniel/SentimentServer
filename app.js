var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const bodyParser = require('body-parser');
const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

const fs = require('fs');
const csv = require('csv-parser');

var app = express();

let positiveArray = [];
let negativeArray = [];

var natural = require('natural'),
  porterStemmer = natural.PorterStemmerRu,
  classifier = new natural.BayesClassifier(porterStemmer);

readPositive();

const allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
}
app.use(allowCrossDomain)

router.get('/', function(req, res, next) {
    res.status(200).send('Сервер работает');
});

router.post('/sentiment', function(req, res) {
    let comments = req.body.info;

    if (comments === undefined) {
        res.status(500).send("Некорректные данные");
    } else {
        let sentimentComments = getSentiment(comments);
        res.status(200).send(sentimentComments); 
    }
});

function readPositive () {
    fs.createReadStream('positive.csv')
        .pipe(csv())
        .on('data', (data) => {
            positiveArray.push(Object.values(data)[0].split(';')[3])
        })
        .on('end', () => {
            console.log('Считаны позитивные');
            readNegative();
        });
}

function readNegative () {
    fs.createReadStream('negative.csv')
        .pipe(csv())
        .on('data', (data) => {
            negativeArray.push(Object.values(data)[0].split(';')[3])
        })
        .on('end', () => {
            console.log('Считаны негативные');
            trainModel();
        });
}

function trainModel() {
    for (let i = 0; i < 30000; i++) {
        classifier.addDocument(positiveArray[i], 'good'); 
    };

    for (let i = 0; i < 30000; i++) {
        classifier.addDocument(negativeArray[i], 'bads');
    };

    classifier.train();

    console.log('Обучено');
    getAccuracy();
}

function getSentiment(arrayComments) {
    let arraySentiment = [];
    arrayComments.forEach((elem) => {
        let result;

        if (elem.text === '') {
            result = 'neutral'
        } else if (!elem.text.match(/[а-яА-Я]/)) {
            result = 'neutral'
        } else {
            result = classifier.classify(elem.text);
        }
        arraySentiment.push(
            {
                text: elem.text,
                sentiment: result
            }
        );
    });
    return arraySentiment;
}

function getAccuracy() {
    let countTrue = 0;
    for (let i = 30000; i < 31000; i++) {
        if (classifier.classify(positiveArray[i]) == 'good') {
            countTrue++;
        }
    };
    console.log(countTrue);

    let countFalse = 0;
    for (let i = 34000; i < 35000; i++) {
        if (classifier.classify(negativeArray[i]) == 'bads') {
            countFalse++;
        }
    };
    console.log(countFalse);
}


app.use(router)

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;

