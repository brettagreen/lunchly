/** Routes for Lunchly */
const express = require("express");
const moment = require('moment');

const Customer = require("./models/customer");
const Reservation = require("./models/reservation");

const router = new express.Router();

/** Homepage: show list of customers. */
router.get("/", async function(req, res, next) {
  try {
    const customers = await Customer.all();
    for (let x=0; x < customers.length; x++) {
      customers[x].reservation = await Reservation.getMostRecentReservationForCustomer(customers[x].id);
    }
    return res.render("customer_list.html", { customers });
  } catch (err) {
    return next(err);
  }
});

/** Form to add a new customer. */
router.get("/add", async function(req, res, next) {
  try {
    return res.render("customer_new_form.html");
  } catch (err) {
    return next(err);
  }
});

/** Handle adding a new customer. */
router.post("/add", async function(req, res, next) {
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phone = req.body.phone;
    const notes = req.body.notes;
    const middleName = req.body.middleName;

    const customer = new Customer({ firstName, lastName, phone, notes, middleName });
    await customer.save();

    return res.redirect(`/${customer.id}/`);
  } catch (err) {
    return next(err);
  }
});

/** Form to search for customer by name. */
router.get("/search", async function(req, res, next) {
  try {
    return res.render("find_customer_form.html");
  } catch (err) {
    return next(err);
  }
});

/** Process find customer form, redirect to customer page. */
router.post("/search", async function(req, res, next) {
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phone = req.body.phone;

    if (!firstName && !lastName && !phone) {
      throw new Error("make sure you include a value for at least one of the search fields.");
    }

    const customer = await Customer.findCustomer(firstName, lastName, phone);

    return res.redirect(`/${customer.id}/`);
  } catch (err) {
    return next(err);
  }
});

//get list of top ten customers based on number of reservations they have
router.get('/topCustomers', async function(req, res, next) {
  try {
    const results = await Reservation.getTopCustomers();
    const customers = [];

    for (let x=0; x < results.rows.length; x++) {
      customers.push([await Customer.get(results.rows[x].customer_id), results.rows[x].count]);
    }
    return res.render('best_customers_list.html', { customers });

  } catch (err) {
    return next(err);
  }
});

/** Show a customer, given their ID. */
router.get("/:id", async function(req, res, next) {
  try {
    const customer = await Customer.get(req.params.id);

    const reservation = await customer.getMostRecentReservation();
    if (reservation) {
      const currDate = moment(new Date());
      const dateToTest = moment(reservation.startAt);
      const diffDays = currDate.diff(dateToTest, 'days');
  
      reservation.pretty = diffDays;
    }

    return res.render("customer_detail.html", { customer, reservation });
  } catch (err) {
    return next(err);
  }
});

/** Show form to edit a customer. */
router.get("/:id/edit", async function(req, res, next) {
  try {
    const customer = await Customer.get(req.params.id);

    res.render("customer_edit_form.html", { customer });
  } catch (err) {
    return next(err);
  }
});

/** Handle editing a customer. */
router.post("/:id/edit", async function(req, res, next) {
  try {
    const customer = await Customer.get(req.params.id);
    customer.firstName = req.body.firstName;
    customer.lastName = req.body.lastName;
    customer.phone = req.body.phone;
    customer.notes = req.body.notes;
    customer.middleName = req.body.middleName;
    
    await customer.save();

    return res.redirect(`/${customer.id}/`);
  } catch (err) {
    return next(err);
  }
});

/** Handle adding a new reservation. */
router.post("/:id/add-reservation", async function(req, res, next) {
  try {
    const customerId = req.params.id;
    const startAt = new Date(req.body.startAt);
    const numGuests = req.body.numGuests;
    const notes = req.body.notes;
    const reservation = new Reservation({
      customerId,
      startAt,
      numGuests,
      notes
    });
    await reservation.save();

    return res.redirect(`/${customerId}/`);
  } catch (err) {
    return next(err);
  }
});

//show edit reservation form
router.get('/:id/edit-reservation', async function(req, res, next) {
  try {
    const reservation = await Reservation.get(req.params.id);

    res.render("reservation_edit_form.html", { reservation });
  } catch (err) {
    return next(err);
  }
});

// Handle editing a reservation.
router.post("/:id/edit-reservation", async function(req, res, next) {
  try {
    const reservation = await Reservation.get(req.params.id);
    reservation.numGuests = req.body.numGuests;
    reservation.startAt = new Date(req.body.startAt);
    reservation.notes = req.body.notes;
    
    await reservation.save();

    return res.redirect(`/${reservation.customerId}/`);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
