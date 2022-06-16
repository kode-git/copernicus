from flask import Flask, jsonify, render_template, request
import pandas as pd 
import json 

df = {}
year = 2011 #year in the name of the file
for i in range(6, 9): #index in the name of the file
    df[year] = pd.read_csv('../../dtp_index/italy-dtp-'+str(2011)+'-'+str(6)+'-index.csv', header = 0, names=['days', 'time', 'lat', 'lon', 'discharge', 'temp', 'prec'])
    #df = pd.read_csv('../../italy-dtp-2017-12.csv', header = 0, names=['days', 'time', 'lat', 'lon', 'discharge', 'temp', 'prec'])
    df_drop = df[year].drop(columns = ['days', 'time', 'discharge', 'temp', 'prec'], inplace=False)
    df[year]['coords'] = df_drop.apply(tuple, axis=1)
    df[year] = df[year].set_index(['coords', 'time'])
    year += 1

def getYearData(year, c):
    for coord, time in df[year].groupby(level=0):
        if coord[0] == c[0] and coord[1] == c[1]:
            return df[year].loc[c, :]['discharge'].reset_index(drop=True).values.tolist()
    return []

app = Flask(__name__)
@app.route("/plot", methods=['GET'])
def plot():
    msg = {}
    args = request.args
    str_c = args.get('coords')
    str_c = str_c.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    for year in range(2011, 2014):
        msg[year] = getYearData(year, c)
        if msg[year] == []:
            return jsonify({"data": []})

        """
        for coord, time in df[year].groupby(level=0):
            if coord[0] == c[0] and coord[1] == c[1]:
                msg[year] = df[year].loc[c, :]['discharge'].reset_index(drop=True).values.tolist()
        """        
        #return jsonify({"data": df[2011].loc[c, :]['discharge'].reset_index(drop=True).values.tolist()})

    return jsonify({"data": msg})

@app.route("/")
def index():
 return render_template('index.html')

if __name__ == '__main__':
    app.run()