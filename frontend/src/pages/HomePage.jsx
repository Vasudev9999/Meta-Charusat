import React from "react";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <nav style={styles.nav}>
        <h1>MetaCharusat</h1>
      </nav>
      <div style={styles.container}>
        <button onClick={() => navigate("/avatar")} style={styles.button}>
          Enter in Campus
        </button>
      </div>
    </div>
  );
};

const styles = {
  nav: {
    backgroundColor: "#f0f0f0",
    padding: "10px"
  },
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80vh"
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px"
  }
};

export default HomePage;