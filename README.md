running-route-tileserver
========================

Tutorial for creating a tileserver from GPS running routes

###Introduction

Nautilytics was recently approached by WalkJogRun, one of the leaders in iOS GPS running applications, to create a visualization of the most popular public running routes in their global network.
Nautilytics didn’t want to simply create pieces of art from the three plus years of running routes;
we wanted to make the routes as dynamic as possible by creating overlays to add the popular routes on top of a Google Map.
The result of the project was to give users of the application a better understanding of where people were running and where they may want to run in a new city.
In theory, if many runners are running the same route then it may be safer, more scenic, and less polluted.

###Tileserver

The approach we took to creating the tileserver was to spin up a new small Ubuntu LTS virtual machine using Windows Azure –
we chose Azure because of their great BizSpark program for startups. After some deliberation and googling,
we decided our best technology stack for this project was the PostGIS extension of PostgreSQL, node.js, and Mapnik.
node.js and PostGIS were easy to get up and running correctly; Mapnik on the other hand was a bit trickier, so we’ll outline the steps.

####Mapnik Installation

We’ve had the best success running the v.2.3x version of [mapnik](https://github.com/mapnik/mapnik/wiki/Mapnik-Installation):

```
sudo apt-get install -y python-software-properties
sudo add-apt-repository ppa:mapnik/nightly-2.3
sudo apt-get update
sudo apt-get install libmapnik libmapnik-dev mapnik-utils python-mapnik
sudo apt-get install mapnik-input-plugin-postgis
```

To ensure mapnik installed correctly:

    mapnik-config

####Setting up the Backend




