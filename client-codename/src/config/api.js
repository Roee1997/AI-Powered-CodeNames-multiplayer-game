const API_BASE =
  import.meta.env.PROD
    ? "https://proj.ruppin.ac.il/cgroup81/test2/tar1"
    : "http://localhost:5150";

export default API_BASE;
