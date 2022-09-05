from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/get_random_coordinates/<city>', views.get_random_coordinates, name='Request random coordinates'),
]
