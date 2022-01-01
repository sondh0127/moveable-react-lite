import * as React from "react";
import "./App.css";
import Editor from "./components/Editor";

class App extends React.Component {
    public render() {
        return <div className="app">
            <Editor  />
        </div>;
    }
}

export default App;
