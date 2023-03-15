/** Reservation for Lunchly */

const moment = require("moment");
const db = require("../db");

/** A reservation for a party */
class Reservation {
  constructor({id, customerId, numGuests, startAt, notes}) {
    this.id = id;
    this.customerId = customerId;
    this.numGuests = numGuests;
    this.startAt = startAt;
    this.notes = notes;
  }

  get customerId() {
    return this._customerId;
  }

  set customerId(value) {
    if (this._customerId) {
      throw new Error("you can't change an existing customerId to something else.");
    } else {
      this._customerId = value;
    }
  }

  /**
   * @param {string} value
   */
  set notes(value) {

    if (!value) {
      value = '';
    }
    this._notes = value;
  } 

  get notes() {
    return this._notes;
  }

  get numGuests() {
    return this._numGuests;
  }

  set numGuests(value) {
    if (value < 1) {
      throw new Error("hey now! we require at least one guest per reservation.");
    }
    this._numGuests = value;
  }

  get startAt() {
    return this._startAt;
  }

 set startAt(value) {
    this._startAt = value;
 }

  /** get a reservation by ID. */
  static async get(id) {
    const results = await db.query(
      `SELECT id, 
          customer_id AS "customerId",  
          num_guests AS "numGuests", 
          start_at AS "startAt", 
          notes
        FROM reservations WHERE id=$1`,
      [id]
    );

    const reservation = results.rows[0];

    if (reservation === undefined) {
      const err = new Error(`No such reservation: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Reservation(reservation);
  }

  /** formatter for startAt */
  get formattedStartAt() {
    return moment(this.startAt).format("MMMM Do YYYY, h:mm a");
  }

  /** given a customer id, find their reservations. */
  static async getReservationsForCustomer(customerId) {
    const results = await db.query(
          `SELECT id, 
           customer_id AS "customerId", 
           num_guests AS "numGuests", 
           start_at AS "startAt", 
           notes AS "notes"
         FROM reservations 
         WHERE customer_id = $1`,
        [customerId]
    );
    return results.rows.map(row => new Reservation(row));
  }

    /** find most recent reservation a customer has made. */
  static async getMostRecentReservationForCustomer(customerId) {
      const result = await db.query(
            `SELECT id, 
             customer_id AS "customerId", 
             num_guests AS "numGuests", 
             start_at AS "startAt", 
             notes AS "notes"
           FROM reservations 
           WHERE customer_id = $1
           ORDER BY start_at desc
           LIMIT 1`,
          [customerId]
      );
      if (result.rows.length > 0) {
        return new Reservation(result.rows[0]);
      }
    }

  /** save this reservation. */
  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO reservations (customer_id, num_guests, start_at, notes)
              VALUES ($1, $2, $3, $4)
              RETURNING id`,
        [this.customerId, this.numGuests, this.startAt, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE reservations SET customer_id=$1, num_guests=$2, start_at=$3, notes=$4
              WHERE id=$5`,
              [this.customerId, this.numGuests, this.startAt, this.notes, this.id]
      );
    }
  }

  //return top 10 customers by number of reservations made.
  static async getTopCustomers() {
    const results = await db.query(`SELECT r.customer_id, COUNT(*) FROM reservations r GROUP BY (r.customer_id)
       ORDER BY COUNT(*) desc LIMIT 10`);
    return results;
  }
}


module.exports = Reservation;
