import React, { useRef, useEffect, useState } from "react";

const TiledMap = () => {
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [tilesetInfo, setTilesetInfo] = useState(null);
  const [tilesetImage, setTilesetImage] = useState(null);

  useEffect(() => {
    // Load map JSON
    fetch("/assets/map/charusat.tmj")
      .then((res) => res.json())
      .then((data) => {
        setMapData(data);
        const firstTileset = data.tilesets[0];
        // If tileset uses TSX format
        if (firstTileset.source) {
          fetch("/assets/tiles/test1.tsx")
            .then((res) => res.text())
            .then((tsxText) => {
              // Parse the TSX XML file
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(tsxText, "text/xml");
              const imageElem = xmlDoc.getElementsByTagName("image")[0];
              const imageSource = imageElem.getAttribute("source");
              const imageWidth = parseInt(imageElem.getAttribute("width"), 10);
              const columns = Math.floor(imageWidth / data.tilewidth);
              setTilesetInfo({
                ...firstTileset,
                image: "/assets/tiles/" + imageSource,
                columns,
              });
            })
            .catch((err) => console.error("Error fetching TSX file:", err));
        } else {
          setTilesetInfo(firstTileset);
        }
      })
      .catch((err) => console.error("Error loading map:", err));
  }, []);

  useEffect(() => {
    if (tilesetInfo && !tilesetImage) {
      const img = new Image();
      img.src = tilesetInfo.image;
      img.onload = () => setTilesetImage(img);
      img.onerror = (err) =>
        console.error("Error loading tileset image:", err);
    }
  }, [tilesetInfo, tilesetImage]);

  useEffect(() => {
    if (mapData && tilesetInfo && tilesetImage && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const { tilewidth, tileheight, width, height, layers } = mapData;
      const columns = tilesetInfo.columns;
      
      // Set canvas dimensions based on the map.
      canvasRef.current.width = width * tilewidth;
      canvasRef.current.height = height * tileheight;
      
      layers.forEach((layer) => {
        if (layer.type === "tilelayer" && layer.visible) {
          for (let i = 0; i < layer.data.length; i++) {
            const tileId = layer.data[i];
            if (tileId === 0) continue;
            const index = tileId - 1;
            const sx = (index % columns) * tilewidth;
            const sy = Math.floor(index / columns) * tileheight;
            const dx = (i % width) * tilewidth;
            const dy = Math.floor(i / width) * tileheight;
            ctx.drawImage(
              tilesetImage,
              sx,
              sy,
              tilewidth,
              tileheight,
              dx,
              dy,
              tilewidth,
              tileheight
            );
          }
        }
      });
    }
  }, [mapData, tilesetInfo, tilesetImage]);

  if (!mapData || !tilesetInfo || !tilesetImage)
    return <div>Loading map...</div>;
  return (
    <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
  );
};

export default TiledMap;