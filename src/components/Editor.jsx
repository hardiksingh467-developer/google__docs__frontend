// React below
import { useEffect, useRef, useState } from "react";

// Quill below
import Quill from "quill";
import "quill/dist/quill.snow.css";

// MUI below
import { Box } from "@mui/material";
import styled from "@emotion/styled";

// MUI styling
const Component = styled.div`
  background: #f5f5f5;
`;

// Socket connection
import { io } from "socket.io-client";

// useParam below
import { useParams } from "react-router-dom";

const Editor = () => {
  const { id } = useParams();
  const allowSave = useRef(false);
  const isOnlineOnMount = navigator.onLine;
  console.log("Online:", isOnlineOnMount);
  // if(!isOnline){
  //   localStorage.setItem("prevData", quillServer.getContents());
  // }
  const [isOnline, setIsOnline] = useState(isOnlineOnMount);

  // for mountning QuillJS
  useEffect(() => {
    console.clear();
    console.log("Editor Component mount");

    const toolbarOptions = [
      ["bold", "italic", "underline", "strike"], // toggled buttons
      ["blockquote", "code-block"],
      ["link", "image", "video", "formula"],

      [{ header: 1 }, { header: 2 }], // custom button values
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      [{ script: "sub" }, { script: "super" }], // superscript/subscript
      [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
      [{ direction: "rtl" }], // text direction

      [{ size: ["small", false, "large", "huge"] }], // custom dropdown
      [{ header: [1, 2, 3, 4, 5, 6, false] }],

      [{ color: [] }, { background: [] }], // dropdown with defaults from theme
      [{ font: [] }],
      [{ align: [] }],

      ["clean"], // remove formatting button
    ];

    // initialize quill in useEffect to ensure execution after DOM availability

    const quillServer = new Quill("#container", {
      modules: {
        toolbar: toolbarOptions,
      },
      theme: "snow",
    });

    // disable quill Server until document is fetched or created
    quillServer.disable();
    quillServer.setText("Loading Document...");

    quillServer.on("text-change", (delta, oldData, source) => {
      console.log("delta changed", delta);
      if (source !== "user") return;

      socket.emit("send-changes", { id, delta });
    });

    // connect To backend
    // const BACKEND_URL = "http://192.168.1.13:9000/";
    const BACKEND_URL = "http://localhost:9000/";

    // console.log("gonna try connecting to socket");

    const socket = io(BACKEND_URL, {
      autoConnect: false,
      path: "/api/v1/signalling/socket", // this must match the backend
      transports: ["websocket"], // optional: force WebSocket
    });

    // connect to backend
    socket.connect();

    // fn to handle fetching existing doc____
    socket.emit("get-document", id);
    socket.once("load-document", (document) => {
      console.log("listening once");
      console.log("document is ", document);
      quillServer.setContents(document.data);
      quillServer.enable();
      allowSave.current = true;
      alert("Open this link in another tab to edit the same document");
    });

    // socket.on("load-document", document => {
    //   console.log("listening on");
    //   quillServer.setContents(document);
    //   quillServer.enable();
    // });
    // ______________________________________

    // fn to handle remote client changes____
    const handleChange = (delta) => {
      quillServer.updateContents(delta);
    };

    socket.on("receive-changes", handleChange);
    // ______________________________________

    // fn to handle save changes_____________
    const interval = setInterval(() => {
      console.log("Saving document...", quillServer?.getContents());
      if (!allowSave.current) return;
      console.log("Saving document...");
      socket.emit("save-document", { id, delta: quillServer?.getContents() });
    }, 2500); // every 9 minutes, 9000*60*1000
    // ______________________________________

    return () => {
      console.log("Editor Component UN-mount");
      socket.disconnect();
      quillServer.off("text-change");
      clearInterval(interval);
    };
  }, []);

  return (
    <Component>
      <Box id="toolbar" sx={{ marginBottom: "10px" }} />
      <Box id="container" className="container"></Box>
    </Component>
  );
};

export default Editor;
