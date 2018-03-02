package com.nasa;

import java.io.IOException;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import fi.iki.elonen.NanoHTTPD.Response;

//import org.nanohttpd.NanoHTTPD;
// NOTE: If you"re using NanoHTTPD < 3.0.0 the namespace is different,
//       instead of the above import use the following:
import fi.iki.elonen.NanoHTTPD;
import java.util.HashMap;
import com.google.gson.Gson;

public class App extends NanoHTTPD {

  public App() throws IOException {
    super(8080);
    start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
    System.out.println("\nRunning at port 8080/ \n");
  }

  public static void main(String[] args) {
    try {
      new App();
    } catch (IOException ioe) {
      System.err.println("Couldn't start server:\n" + ioe);
    }
  }

  @Override
  public Response serve(IHTTPSession session) {
    Map<String, String> map = new HashMap<String, String>();
    Method method = session.getMethod();
    if (Method.PUT.equals(method) || Method.POST.equals(method)) {
      try {
        session.parseBody(map);
      } catch (IOException ioe) {
        return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, "SERVER INTERNAL ERROR: IOException: " + ioe.getMessage());
      } catch (ResponseException re) {
        return newFixedLengthResponse(re.getStatus(), MIME_PLAINTEXT, re.getMessage());
      }
    }
    /*
      example client request body
      {
        startHandrail: 'ABC',
        endHandrail: 'XYZ',
        nodes: [{
        	"unique_node_name": "HWY_XXX",
        	"geometry_file_name": "HWY_XXX.stl",
        	"x": "221.42",
        	"y": "0.00",
        	"z": "190.95",
        	"pitch": "180.00",
        	"yaw": "0.00",
        	"roll": "180.00",
        	"parent_node_name": "SSREF"
        },
        {
        	"unique_node_name": "HWY_XXX",
        	"geometry_file_name": "HWY_XXX.stl",
        	"x": "221.42",
        	"y": "0.00",
        	"z": "190.95",
        	"pitch": "180.00",
        	"yaw": "0.00",
        	"roll": "180.00",
        	"parent_node_name": "SSREF"
        }],
      }
    */
    String postBody = map.get("postData");
    Gson gson = new Gson();
    RouteRequest rr = new RouteRequest("", "", new ArrayList<Node>());
    try {
      rr = gson.fromJson(postBody, RouteRequest.class);
    } catch (Exception e) {
      System.out.println(e.getMessage());
    }
    System.out.println("Start: " + rr.getStartHandrail());
    System.out.println("End: " + rr.getEndHandrail());
    System.out.println("Running algorithm...");
    DijkstraPaths dp = new DijkstraPaths();
    ArrayList<List<Node>> listOfNodeLists = new ArrayList<List<Node>>();
    String resultListsString = "";
    int[] thresholds = {46, 54, 62};
    for (int i = 0; i < thresholds.length; i++) {
      List<Node> nodes = new ArrayList<Node>();
      ArrayList<String> nodeIds = new ArrayList<String>();
      try {
        nodes = dp.getShortestPath(rr.getStartHandrail(), rr.getEndHandrail(), rr.getNodes(), thresholds[i]);
      } catch (Exception e) {
        System.out.println("There was an error running the algorithm");
        e.printStackTrace();
      }
      listOfNodeLists.add(nodes);
      if (nodes == null) {
        System.out.println("There is no path");
      } else {
        System.out.println("Route " + (i + 1));
        System.out.println("---------------------------------");
        Node nodeLast = null;
        double distance = 0;
        for (Node node : nodes) {
          String nodeId = node.getNodeId();
          nodeIds.add(nodeId);
          
          try {
              if (nodeLast != null) {
                distance = node.node_distance_formula(node, nodeLast);
                distance = (double) Math.round(distance * 100) / 100;
              }
          }catch(Exception ex){
          }
         
          System.out.println(nodeId + " (Distance: " + distance + " in.)");
          nodeLast = node;
        }
        System.out.println("---------------------------------");
      }
      resultListsString += "{\"nodes\":" + gson.toJson(nodeIds) + "}";
      if (i != thresholds.length - 1) {
        resultListsString += ", ";
      }
    }
    System.out.println("All done!");
    /*
      use nodes to process shortest path and return a json array of routes documented in architecture document. For example,
      [
        {
          nodes: [list of node ids],
          ...otherMetaDataProperties
        }
      ]
    */
    String resultJson = "[" + resultListsString + "]";
    Response response = newFixedLengthResponse(resultJson);
    response.addHeader("Access-Control-Allow-Origin", "*");
    return response;
  }
}
