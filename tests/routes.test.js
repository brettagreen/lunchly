process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const db = require('../db');
const striptags = require('striptags');
const moment = require('moment');

//beforeAll(createTestData);

afterAll(async function() {
    await db.end();
    process.env.NODE_ENV = 'dev';
});

describe('GET /', function() {
    test('return a list of all customers', async function() {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toEqual(expect.stringContaining("John Benton"));
        expect(res.text).toEqual(expect.stringContaining("<li>May 16th 2018, 6:42 am for 3.</li>"))        
    });
});

describe('GET /add', function() {
    test('display form to add new customer', async function() {
        const res = await request(app).get('/add');
        expect(res.statusCode).toBe(200);
        expect(res.text).toEqual(expect.stringContaining("<h1>Add a Customer</h1>"));
        expect(res.text).toEqual(expect.stringContaining(`<form action="/add/" method="POST">`));
    });
});

describe('GET /search', function() {
    test('display for to search for a customer', async function() {
        const res = await request(app).get('/search');
        expect(res.statusCode).toBe(200);
        expect(res.text).not.toEqual(expect.stringContaining("<h1>I'm a little teapot short and stout</h1>"));
        expect(res.text).toEqual(expect.stringContaining(`<h2>Search by first name, last name OR by phone number. Otherwise, you won't get results.</h2>`));
    });
});

describe('GET /topCustomers', function() {
    test('show list of our top customers and their # of reservations', async function() {
        const res = await request(app).get('/topCustomers');
        expect(res.statusCode).toBe(200);
        expect(striptags(res.text)).toEqual(expect.stringContaining("David Martin, 6"));
        expect(striptags(res.text)).toEqual(expect.stringContaining("Jessica Abbott, 5"));
    });
});

describe('GET /:id', function() {
    test('show details of customer based on customer id', async function() {
        let res = await request(app).get('/1');
        expect(res.statusCode).toBe(200);
        expect(striptags(res.text)).toEqual(expect.stringContaining('Anthony Gonzales'));
        expect(striptags(res.text)).toEqual(expect.stringContaining('Notes: Money voice rate chair war subject kid.'));
        res = await request(app).get('/2');
        expect(striptags(res.text)).toEqual(expect.stringContaining('Joseph Wells'));
        expect(striptags(res.text)).toEqual(expect.stringContaining('Notes: Else quite deal culture deep candidate exactly.'));
    });
});

describe('GET /:id/edit', function() {
    test('show customer edit form', async function() {
        let res = await request(app).get('/1/edit');
        expect(res.statusCode).toBe(200);
        expect(striptags(res.text)).toEqual(expect.stringContaining('Money voice rate chair war subject kid.'));
        res = await request(app).get('/2/edit');
        expect(striptags(res.text)).toEqual(expect.stringContaining('Else quite deal culture deep candidate exactly.'));
    });
});

describe('GET /:id/edit-reservation', function() {
    test('show edit reservation form', async function() {
        let res = await request(app).get('/1/edit-reservation');
        expect(res.statusCode).toBe(200);
        expect(striptags(res.text)).toEqual(expect.stringContaining('Decade college home heart.'));
        expect(res.text).toEqual(expect.stringContaining('<button class="btn btn-primary">Modify reservation</button>'));
    });
});

describe('POST /add', function() {
    test('create a new customer', async function() {
        const newCustomer = await request(app).post('/add').type('form').send({lastName: "Tomlinson", firstName: "Taylor", phone: '',
                notes: '', middleName: "Alexis"});
        //redirect to customer page
        const res = await request(app).get(newCustomer.headers.location);
        expect(res.text).toEqual(expect.stringContaining("<h1>Taylor Alexis Tomlinson</h1>"));
        expect(res.text).toEqual(expect.stringContaining("<title>Lunch.ly Taylor Alexis Tomlinson </title>"));
    });
});

describe('POST /search', function() {
    test('search for a customer using the customer search form', async function() {
        const customer = await request(app).post('/search').type('form').send({firstName: "Douglas", lastName: "Graves"});
        const res = await request(app).get(customer.headers.location);
        expect(striptags(res.text)).toEqual(expect.stringContaining('Phone:  (872)460-3541x498'));
        expect(res.text).toEqual(expect.stringContaining('<h1>Douglas Graves</h1>'));
    });

    test('search for non-existent customer', async function() {
        const res = await request(app).post('/search').type('form').send({firstName: "Elmo", lastName: "Reeves"});
        expect(striptags(res.text)).toEqual(expect.stringContaining('No customer found by that name and/or phone number.'))
    });

    test ('search for customer w/ no form inputs', async function() {
        const res = await request(app).post('/search').type('form').send({});
        expect(striptags(res.text)).toEqual(expect.stringContaining('make sure you include a value for at least one of the search fields.'));
    });
});

describe('POST /:id/edit', function() {
    test("edit a customer's profile", async function() {
        const customer = await request(app).post('/55/edit').type('form').send({firstName: "Douglasss",
         lastName: "Gravesss", middleName: "The Enforcer", notes: "I'm a free man!"});
        const res = await request(app).get(customer.headers.location);
        expect(striptags(res.text)).toEqual(expect.stringContaining('Douglasss The Enforcer Gravesss'));
        expect(striptags(decode(res.text))).toEqual(expect.stringContaining("I'm a free man!"));
    });
});

//not optimized. only most recent reservation will show on customer page so date needs to be as recent as possible.
describe('POST /:id/add-reservation', function() {
    test("add a new reservation for a customer", async function() {
        const date = moment(new Date()).format('YYYY-MM-DD');
        const reservation = await request(app).post('/55/add-reservation').type('form').send(
            {startAt: `${date} 5:20 pm`,
            numGuests: 18, 
            notes: "It's going to be a great time!"}
            );
            console.log(reservation);
        const res = await request(app).get(reservation.headers.location);
        expect(striptags(res.text)).toEqual(expect.stringContaining("It&#39;s going to be a great time!"));
        expect(striptags(res.text)).toEqual(expect.stringContaining(`${moment(date).format("MMMM Do YYYY")}, 5:20 pm for 18`));
    });
});

describe('POST /:id/edit-reservation', function() {
    test('edit a reservation', async function() {
        const date = moment(new Date()).format('YYYY-MM-DD');
        const reservation = await request(app).post('/9/edit-reservation').type('form').send({
            numGuests: 25,
            notes: "far out, trippy, wavy gravy, copacetic bro",
            startAt: `${date} 7:07 pm`
        });
        const res = await request(app).get(reservation.headers.location);
        expect(striptags(res.text)).toEqual(expect.stringContaining("far out, trippy, wavy gravy, copacetic bro"));
        expect(striptags(res.text)).toEqual(expect.stringContaining(`${moment(date).format("MMMM Do YYYY")}, 7:07 pm for 25`));        

    });
});