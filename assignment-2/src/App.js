import logo from "./logo.svg";
import "./App.css";
import { useState, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Accordion from "react-bootstrap/Accordion";
import AWS from "aws-sdk";
import { useSpeechContext } from "@speechly/react-client";

AWS.config.update({
  region: "us-east-1",
  accessKeyId: "AKIAVTCRWBNNJO4BMFGF",
  secretAccessKey: "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",
});

function App() {
  const { segment, listening, attachMicrophone, start, stop } = useSpeechContext();

  const [searchImage, setSearchImage] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [message, setMessage] = useState({ text: "" });
  const [voice, setVoice] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState(null);

  const [flag, setFlag] = useState(false);

  const [fileName, setFileName] = useState(null);
  const [fileData, setFileData] = useState(null);

  var s3 = new AWS.S3();
  var lexruntime = new AWS.LexRuntimeV2();
  // var transcribe = new AWS.TranscribeService();

  const botID = "MPEVQZALWM";
  const botAliasID = "TSTALIASID";
  const locale = "en_US";
  const sessionID = "lex";
  const region = "us-east-1";

  useEffect(() => {
    if (segment) {
      setVoiceMessage(segment.words[0].value);
    }
  }, [segment]);

  const handleVoice = async () => {
    if (listening) {
      await stop();
    } else {
      await attachMicrophone();
      await start();
    }
  };

  function searchImageHandler(event) {
    event.preventDefault();

    const updatedMessageList = [...messageList];

    updatedMessageList.push(messageClient(event.target[0].value));
    setMessage({ text: event.target[0].value });

    const params = {
      botAliasId: botAliasID,
      botId: botID,
      localeId: locale,
      sessionId: sessionID,
      text: event.target[0].value,
    };

    lexruntime.recognizeText(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("DATA");
        console.log(data);
        console.log(data.messages !== undefined);
        if (data.messages !== undefined) {
          for (var i = 0; i < data.messages.length; i++) {
            if (data.messages[i].content.includes("https://")) {
              console.log(
                data.messages[i].content.slice(
                  "https://b2-photos.s3.amazonaws.com/".length,
                  data.messages[i].content.length
                )
              );
              var s3params = {
                Bucket: "b2-photos",
                Key: data.messages[i].content.slice(
                  "https://b2-photos.s3.amazonaws.com/".length,
                  data.messages[i].content.length
                ),
              };
              s3.getObject(s3params, function (err, d) {
                updatedMessageList.push(messageImage(d.Body.toString("utf-8")));
                setMessageList([...updatedMessageList]);
              });
            } else {
              updatedMessageList.push(messageLex(data.messages[i].content, updatedMessageList.length + i));
            }
          }
          setFlag(true);
        }
        setMessageList([...updatedMessageList]);
        event.target.reset();
        setVoiceMessage(null);
      }
    });
  }

  function messageImage(msg) {
    console.log(msg);
    return (
      <div
        style={{
          position: "relative",
          right: "-0.75rem",
          color: "black",
          backgroundColor: "#e2eeff",
          width: "25rem",
          margin: "0.5rem 0",
          padding: "1rem",
        }}
        key={msg}
      >
        <img src={msg} style={{ width: "100%", height: "100%" }} alt={msg}></img>
      </div>
    );
  }
  function messageClient(msg) {
    console.log("MESSAGE");
    console.log(msg);
    return (
      <div
        style={{
          position: "relative",
          right: "-16.5rem",
          color: "black",
          backgroundColor: "#e2eeff",
          width: "10rem",
          margin: "0.5rem 0",
        }}
        key={msg}
      >
        {msg}
      </div>
    );
  }

  function messageLex(msg, key) {
    console.log(msg);
    console.log(key);
    return (
      <div
        style={{
          position: "relative",
          right: "-0.75rem",
          color: "black",
          backgroundColor: "#e2eeff",
          width: "10rem",
          margin: "0.5rem 0",
        }}
        key={key}
      >
        {msg}
      </div>
    );
  }

  function encodeImage(event) {
    const imgFile = event.target.files[0];
    var fileReader = new FileReader();
    console.log(imgFile.name);

    fileReader.onload = function (fileLoadedEvent) {
      var srcData = fileLoadedEvent.target.result;

      setFileData(srcData);
      setFileName(imgFile.name);
    };

    fileReader.readAsDataURL(imgFile);
  }

  function handleUpload(event) {
    event.preventDefault();

    var metadata = { "x-amz-meta-customLabels": event.target[0].value };
    var params = { Bucket: "b2-photos", Key: fileName, Body: fileData, Metadata: metadata, ACL: "public-read-write" };

    s3.upload(params, function (err, data) {
      console.log(err, data);
    });
    event.target.reset();
  }

  return (
    <div className="App">
      <header className="App-header">
        <Accordion style={{ width: "30rem" }}>
          <Accordion.Item eventKey="0">
            <Accordion.Header>SEARCH IMAGE</Accordion.Header>
            <Accordion.Body>
              <Form onSubmit={searchImageHandler}>
                <Form.Group className="mb-3" controlId="formImage">
                  <div
                    style={{
                      width: "100%",
                      height: "30rem",
                      backgroundColor: "lightgrey",
                      overflowY: "scroll",
                      overflowX: "hidden",
                    }}
                  >
                    {" "}
                    {messageList}
                  </div>
                  <Form.Control
                    type="text"
                    placeholder={"Enter a search term (e.g. Trees)"}
                    defaultValue={voiceMessage}
                    disabled={voice}
                  />
                  <Button
                    onClick={() => {
                      setVoice(!voice);
                      handleVoice();
                    }}
                  >
                    {listening ? "Stop" : "Start"} SPEECH
                  </Button>
                </Form.Group>
                <Button variant="primary" type="submit">
                  SEARCH
                </Button>
              </Form>
              {/* <div className={"mt-3 mb-3"} style={{ width: "27.5rem", height: "27.5rem", backgroundColor: "red" }}>
                {searchImage ? (
                  <img
                    src={`data:image/png;base64,${searchImage}`}
                    alt={"search query content"}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  ""
                )}
              </div> */}
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="1">
            <Accordion.Header>UPLOAD IMAGE</Accordion.Header>
            <Accordion.Body>
              <Form onSubmit={handleUpload}>
                <Form.Group className="mb-3" controlId="formImage">
                  <Form.Label>CUSTOM METADATA</Form.Label>
                  <Form.Control type="text" placeholder={"Enter a custom label (e.g. Trees)"} />
                  <Form.Label>UPLOAD IMAGE</Form.Label>
                  <Form.Control type="file" onChange={encodeImage} />
                </Form.Group>
                <Button variant="primary" type="submit">
                  UPLOAD
                </Button>
              </Form>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </header>
    </div>
  );
}

export default App;
