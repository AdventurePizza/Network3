// @ts-nocheck

import "./App.css";
import React, { useEffect, useState, useContext } from "react";

//ui
import { Button, TextField, Select, MenuItem } from "@material-ui/core";

//logic
import io from "socket.io-client";
import { DAppClient } from "@airgap/beacon-sdk";
//import _ from "underscore";
import { v4 as uuidv4 } from "uuid";
import { FirebaseContext } from "./firebaseContext";
import { useSnackbar } from "notistack";

const socketURL =
  window.location.hostname === "localhost"
    ? "ws://localhost:8000"
    : "wss://network3-backend.herokuapp.com";

const socket = io(socketURL, { transports: ["websocket"] });
const dAppClient = new DAppClient({ name: "Beacon Docs" });
const versionNames = ["0", "v1.0", "v2.0", "v3.0"];
const tempID = uuidv4();

function App() {
  const [activeAccount, setActiveAccount] = useState();
  const [synced, setSynced] = useState("sync");
  const [showUnsync, setShowUnsync] = useState(false);
  const [song, setSong] = useState();
  const { getProfileFB, setProfileFB, getAllProfilesFB } =
    useContext(FirebaseContext);
  const [profile, setProfile] = useState({
    song: song,
    timestamp: Date.now(),
    key: tempID,
    username: "",
  });
  const [profiles, setProfiles] = useState([]);
  const [usernameInput, setUsernameInput] = React.useState("");
  const { enqueueSnackbar } = useSnackbar();
  const [statusHistory, setStatusHistory] = useState([]);
  const [
    version,
    //setVersion
  ] = useState(3);
  const [songInput, setSongInput] = React.useState("");

  function parseSong(song) {
    console.log(song.split("/"));
    let temp = song.split("/");
    setSong({ type: temp[3], id: temp[4] });
  }

  const handleChangeUsername = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.length < 25) setUsernameInput(event.target.value);
    else setUsernameInput(event.target.value.slice(0, 25));
  };

  const handleChangeSong = (event: React.ChangeEvent<HTMLInputElement>) => {
    //validation
    parseSong(event.target.value);
    setSongInput(event.target.value);
  };

  useEffect(() => {
    async function getProfiles() {
      let result = await getAllProfilesFB();
      setProfiles(result.recentStatus);
      setStatusHistory(result.history);
    }
    getProfiles();
  }, [getAllProfilesFB]);
  /*
    function isOnline(address) {
      console.log(address)
      console.log(onlines)
      onlines.find(function (prof, index) {
        if (prof.wallet === address) {
          return true;
        }
        return false;
      });
    }
  */

  useEffect(() => {
    const onProfileChange = (data) => {
      setStatusHistory(
        statusHistory
          .concat(data)
          .sort((a, b) => parseFloat(b.timestamp) - parseFloat(a.timestamp))
      );

      //recent
      profiles.find(function (prof, index) {
        if (prof.key === data.key) {
          setProfiles([
            ...profiles.slice(0, index),
            data,
            ...profiles.slice(index + 1),
          ]);
          return true;
        }
        return false;
      });
    };

    /*const onOnlineChange = (data) => {
      console.log(data)
      setOnlines(data);
    };
*/

    socket.on("profile", onProfileChange);
    //socket.on('online', onOnlineChange);
    return () => {
      socket.off("profile", onProfileChange);
      //socket.off('online', onOnlineChange);
    };
  }, [
    profiles,
    setProfiles,
    statusHistory,
    //setOnlines
  ]);

  useEffect(() => {
    async function getAcc() {
      setActiveAccount(await dAppClient.getActiveAccount());
      if (activeAccount) {
        setSynced(
          activeAccount.address.slice(0, 6) +
            "..." +
            activeAccount.address.slice(32, 36)
        );
        setShowUnsync(true);
        let tempProfile = await getProfileFB(activeAccount.address);
        setProfile(tempProfile);
        setUsernameInput(tempProfile.username);
        socket.emit("join", activeAccount.address);
      } else {
        setSynced("sync");
        setShowUnsync(false);
      }
    }
    getAcc();
  }, [activeAccount, getProfileFB]);

  async function unsync() {
    setActiveAccount(await dAppClient.getActiveAccount());
    if (activeAccount) {
      // User already has account connected, everything is ready
      dAppClient.clearActiveAccount().then(async () => {
        setActiveAccount(await dAppClient.getActiveAccount());
        setSynced("sync");
        setShowUnsync(false);
      });
    }
  }

  async function sync() {
    setActiveAccount(await dAppClient.getActiveAccount());
    //Already connected
    if (activeAccount) {
      setSynced(activeAccount.address);
      setShowUnsync(true);
      socket.emit("join", activeAccount.address);
      return activeAccount;
    }
    // The user is not synced yet
    else {
      try {
        console.log("Requesting permissions...");
        const permissions = await dAppClient.requestPermissions();
        setActiveAccount(await dAppClient.getActiveAccount());
        console.log("Got permissions:", permissions.address);
        setSynced(permissions.address);
        setShowUnsync(true);
      } catch (error) {
        console.log("Got error:", error);
      }
    }
  }

  function updateStatus() {
    if (activeAccount) {
      let timestamp = Date.now();
      setProfile({
        ...profile,
        song: song,
        key: activeAccount.address,
        username: usernameInput,
        timestamp: timestamp,
      });
      //add socket
      socket.emit("profile", {
        ...profile,
        song: song,
        key: activeAccount.address,
        username: usernameInput,
        timestamp: timestamp,
      });
      setProfileFB({
        ...profile,
        song: song,
        key: activeAccount.address,
        username: usernameInput,
        timestamp: timestamp,
      });
      setStatusHistory(
        statusHistory
          .concat([
            {
              ...profile,
              song: song,
              key: activeAccount.address,
              username: usernameInput,
              timestamp: timestamp,
            },
          ])
          .sort((a, b) => parseFloat(b.timestamp) - parseFloat(a.timestamp))
      );

      enqueueSnackbar("Status Updated ! ", {
        variant: "success",
      });
      setUsernameInput("");
    } else {
      sync();
    }
  }

  const handleKeyPressStatus = (event) => {
    if (event.key === "Enter") {
      updateStatus();
    }
  };

  const handleKeyPressSong = (event) => {
    if (event.key === "Enter") {
      //preview
    }
  };

  return (
    <div>
      <div
        className="top-left"
        style={{
          fontSize: "1em",
          display: "flex",
          alignItems: "center",
          marginLeft: 6,
        }}
      >
        <b>Network </b>
        &nbsp;
        <Select
          value={version}
          label="version"
          onChange={(e) => {
            console.log(e.target.value);
            let target;
            if (e.target.value === 1) {
              target = "https://network1.cc/";
            } else if (e.target.value === 2) {
              target = "https://adventurepizza.github.io/Network2/";
            }

            window.location.href = target;
            return null;
          }}
        >
          <MenuItem value={1}> {versionNames[1]}</MenuItem>
          <MenuItem value={2}> {versionNames[2]}</MenuItem>
          <MenuItem value={3}> {versionNames[3]}</MenuItem>
        </Select>
        &nbsp; 📠
      </div>

      <div style={{ fontSize: "0.9em", marginTop: 3, marginLeft: 13 }}>
        <b>History</b>
      </div>

      <div
        style={{
          display: "flex",
          width: "90%",
          marginLeft: "auto",
          marginRight: "auto",
          overflowX: "scroll",
        }}
      >
        {statusHistory &&
          statusHistory.map((profile) => (
            <div
              key={profile.timestamp}
              style={{ textAlign: "center", marginInline: 6 }}
            >
              <div
                style={{
                  width: 300,
                  border: "solid 4px ",
                  marginInline: 4,
                  padding: 1,
                }}
              >
                <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                  <iframe
                    title={profile.timestamp}
                    src={`https://open.spotify.com/embed/${profile.song.type}/${profile.song.id}?utm_source=generator`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allowfullscreen=""
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  ></iframe>
                </div>
                <Button
                  title={profile.key}
                  size={"small"}
                  onClick={async () => {
                    navigator.clipboard.writeText(profile.key);
                    enqueueSnackbar("Address copied ! " + profile.key, {
                      variant: "success",
                    });
                  }}
                >
                  {profile.username}{" "}
                </Button>{" "}
              </div>
            </div>
          ))}
      </div>

      <div style={{ fontSize: "0.9em", marginTop: 3, marginLeft: 13 }}>
        <b>Recent Status</b>
      </div>

      <div
        style={{
          display: "flex",
          width: "90%",
          marginLeft: "auto",
          marginRight: "auto",
          overflowX: "scroll",
        }}
      >
        <div style={{ textAlign: "center", marginInline: 6 }}>
          <div
            style={{
              width: 300,
              border: "solid 4px ",
              marginInline: 4,
              padding: 1,
            }}
          >
            <div style={{ textAlign: "center", fontSize: "1.4em" }}>
              {profile.song && (
                <iframe
                  title={profile.timestamp}
                  src={`https://open.spotify.com/embed/${profile.song.type}/${profile.song.id}?utm_source=generator`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allowfullscreen=""
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                ></iframe>
              )}
            </div>

            <Button
              title={profile.key}
              size={"small"}
              onClick={async () => {
                navigator.clipboard.writeText(profile.key);
                enqueueSnackbar("Address copied ! " + profile.key, {
                  variant: "success",
                });
              }}
            >
              {profile.username}{" "}
            </Button>
          </div>
        </div>

        {profiles &&
          profiles.map(
            (profile) =>
              (!activeAccount || profile.key !== activeAccount.address) && (
                <div
                  key={profile.key}
                  style={{ textAlign: "center", marginInline: 6 }}
                >
                  <div
                    style={{
                      width: 300,
                      border: "solid 4px ",
                      marginInline: 4,
                      padding: 1,
                    }}
                  >
                    <div style={{ textAlign: "center", fontSize: "1.4em" }}>
                      <iframe
                        title={profile.timestamp}
                        src={`https://open.spotify.com/embed/${profile.song.type}/${profile.song.id}?utm_source=generator`}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allowfullscreen=""
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      ></iframe>
                    </div>
                    <Button
                      title={profile.key}
                      size={"small"}
                      onClick={async () => {
                        navigator.clipboard.writeText(profile.key);
                        enqueueSnackbar("Address copied ! " + profile.key, {
                          variant: "success",
                        });
                      }}
                    >
                      {profile.username}{" "}
                    </Button>{" "}
                  </div>
                </div>
              )
          )}
      </div>

      <div style={{ width: "90%", marginLeft: "auto", marginRight: "auto" }}>
        <b>Preview</b>
        <div style={{ marginBottom: 10, width: "100%" }}>
          {song && song.type && song.id ? (
            <iframe
              title="preview"
              src={`https://open.spotify.com/embed/${song.type}/${song.id}?utm_source=generator`}
              width="100%"
              height="152"
              frameBorder="0"
              allowfullscreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            ></iframe>
          ) : (
            "Enter a spotify link for preview"
          )}
        </div>
        <TextField
          id="outlined-basic"
          size={"small"}
          label="Spotify Link"
          variant="outlined"
          placeholder="https://open.spotify.com/"
          onChange={handleChangeSong}
          value={songInput}
          onKeyPress={handleKeyPressSong}
        />

        <br></br>
        <br></br>

        <div style={{ display: "flex", alignItems: "center" }}>
          <TextField
            id="outlined-basic"
            size={"small"}
            label="info"
            variant="outlined"
            placeholder="Status"
            onChange={handleChangeUsername}
            value={usernameInput}
            onKeyPress={handleKeyPressStatus}
          />

          <Button
            size={"small"}
            title={"update status"}
            onClick={() => {
              updateStatus();
            }}
          >
            {" "}
            {activeAccount ? (
              <u>update status</u>
            ) : (
              <u>sync to join network1</u>
            )}{" "}
          </Button>
        </div>
      </div>

      <div className="bottom-left" style={{ position: "absolute" }}>
        <Button title={"Adventure Networks"} size={"small"} onClick={() => {}}>
          {" "}
          <div style={{ textAlign: "left" }}>
            {" "}
            Adventure <br></br>Networks{" "}
          </div>{" "}
        </Button>
      </div>

      <div
        className="bottom-right"
        style={{ position: "absolute", display: "flex", alignItems: "center" }}
      >
        {showUnsync && (
          <Button
            size={"small"}
            title={"unsync"}
            onClick={() => {
              unsync();
            }}
          >
            <u>unsync</u>{" "}
          </Button>
        )}

        {showUnsync && <div> | </div>}
        <Button
          title={"sync"}
          size={"small"}
          onClick={async () => {
            await sync();
          }}
        >
          <u>{synced}</u>{" "}
        </Button>
      </div>
    </div>
  );
}

export default App;
