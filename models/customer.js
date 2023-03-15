/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, middleName='' }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.middleName = middleName;
  }

  /** find all customers. */
  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes,
         middle_name AS "middleName"
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */
  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes,
         middle_name AS "middleName"
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */
  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  //get the most recent reservation for this customer
  async getMostRecentReservation() {
    return await Reservation.getMostRecentReservationForCustomer(this.id);

  }

  /** save this customer. */
  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes, middle_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes, this.middleName]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4, middle_name=$5
             WHERE id=$6`,
        [this.firstName, this.lastName, this.phone, this.notes, this.middleName, this.id]
      );
    }
  }

  //search for specific customer by name, phone.
  static async findCustomer(first, last, phone) {
      let result;

	  if (phone) {
		result = await db.query(`SELECT id, first_name, last_name, phone, notes FROM customers WHERE phone=$1`,[phone]);
	  } else {
		result = await db.query(`SELECT id, first_name, last_name, phone, notes FROM customers WHERE first_name=$1
		AND last_name=$2`,[first, last]);
	  }

    if (result.rows.length > 1) {
		  throw new Error(`Your search returned multiple customers: ${result.rows}. You can try filtering your search by specifying a
			  phone number.`);
	  } else if (result.rows.length === 0) {
		  throw new Error("No customer found by that name and/or phone number.");
	  }
		
	  return new Customer(result.rows[0]);
  }

  //return customer's full name
  get fullName() {
    if (this.middleName != '') {
      return this.firstName + ' ' + this.middleName + ' ' + this.lastName;
    } else {
      return this.firstName + ' ' + this.lastName;
    }
  }

}

module.exports = Customer;
