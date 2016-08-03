#!/bin/bash
curl -s 'http://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=8f6fcb24-290b-461d-9d34-72ed1b3f51f0' > data/park.json
curl -s'http://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=3ada536b-ed8a-4aef-adb9-51e7fe9cda43' > data/facilities.json
curl -s 'http://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=97d0cf5c-dc1f-4b5e-8d02-a07e7cc82db7' > data/plays.json
curl -s 'http://data.taipei/opendata/datalist/apiAccess?scope=resourceAquire&rid=214496c2-38d4-4480-a4d7-c6b013088929' > data/gyms.json

