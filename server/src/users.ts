// @ts-nocheck
import express from "express";
//import firebase from "./firebase";
import { v4 as uuid } from "uuid";
//import {db, increment} from "./firebase";

import * as admin from "firebase-admin";
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

import path from "path";

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(
      //@ts-ignore
      Buffer.from(process.env.FIREBASE_CONFIG_BASE64, "base64").toString(
        "ascii"
      )
    )
  ),
  databaseURL: "https://adventure-ea7cd.firebaseio.com",
});

const db = admin.firestore();
const users = express.Router();

users.get("/profile/:key", async (req, res) => {
  const { key } = req.params as { key: string };
  let result = key;

  const result = await (
    await db
      .collection("network3")
      .doc("profiles")
      .collection("profiles")
      .doc(key)
      .get()
  ).data();

  res.status(200).send(result);
});

users.post("/profile", async (req, res) => {
  const { profile } = req.body as { profile: any };

  await db
    .collection("network3")
    .doc("profiles")
    .collection("profiles")
    .doc(profile.key)
    .set(profile)
    .then();

  db.collection("network3")
    .doc("profiles")
    .collection("history")
    .doc(profile.timestamp.toString())
    .set(profile)
    .then(() => res.sendStatus(200));
});

users.get("/allProfiles", async (req, res) => {
  const snapshot = await db
    .collection("network3")
    .doc("profiles")
    .collection("profiles")
    .get();

  let recentStatus = snapshot.docs.map((doc) => doc.data());
  recentStatus.reverse();

  const snapshot = await db
    .collection("network3")
    .doc("profiles")
    .collection("history")
    .get();

  let history = snapshot.docs.map((doc) => doc.data());
  history.reverse();

  res.status(200).send({ history: history, recentStatus: recentStatus });
});

export default users;
