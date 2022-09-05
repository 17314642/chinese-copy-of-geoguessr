from django.http import HttpResponse
from django.shortcuts import render

import requests
import json
import secrets
from shapely.geometry import Point, Polygon
from django.apps import apps
import shapely.wkt

# Create your views here.
def index(request):
    return render(request, 'polls/index.html')

def get_random_coordinates(request, city):
    try:
        city_wkt = open(apps.get_app_config('polls').path + "/cities/" + city + ".json").readline()[:-1]
        polygon = shapely.wkt.loads(city_wkt)

        min_x, min_y, max_x, max_y = polygon.bounds
        pnt = None

        rng = secrets.SystemRandom()
        while pnt == None or not polygon.contains(pnt):
            pnt = Point(rng.uniform(min_x, max_x), rng.uniform(min_y, max_y))

        data = { 'lat': pnt.y, 'lng': pnt.x }
        print(data)
        return HttpResponse(json.dumps(data), content_type="application/json")
    except Exception as e:
        print(f"Exception occured: \"{e}\"")
        return HttpResponseForbidden()
