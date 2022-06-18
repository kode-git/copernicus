from flask import Flask, jsonify, render_template, request
import pandas as pd 
import json 
import pickle

sarimax = pickle.load(open('./static/model/sarimax', 'rb'))

df = {}
year = 2020 #year in the name of the file
for i in range(15, 17): #index in the name of the file
    str_year = str(year)
    df[str_year] = pd.read_csv('../../dtp_index/italy-dtp-'+str_year+'-'+str(i)+'-index.csv', header = 0, names=['days', 'time', 'lat', 'lon', 'discharge', 'temp', 'prec'])
    df_drop = df[str_year].drop(columns = ['days', 'time', 'discharge', 'temp', 'prec'], inplace=False)
    df[str_year]['coords'] = df_drop.apply(tuple, axis=1)
    df[str_year]['time_2'] = df[str_year]['time']
    df[str_year] = df[str_year].set_index(['coords', 'time'])
    year += 1

def getYearData(year, c):
    for coord, time in df[year].groupby(level=0):
        if coord[0] == c[0] and coord[1] == c[1]:
            lst = df[year].loc[coord, :]['time_2'].reset_index(drop=True).values.tolist()
            years = []
            for e in lst:
                val_y = e.split(' ')[0]
                splitted = val_y.split('-')
                years.append(splitted[2]+'-'+splitted[1]+'-'+splitted[0])
            return [years, df[year].loc[c, :]['discharge'].reset_index(drop=True).values.tolist(), df[year].loc[c, :]['temp'].reset_index(drop=True).values.tolist(), df[year].loc[c, :]['prec'].reset_index(drop=True).values.tolist()]
    return None

app = Flask(__name__)

@app.route('/predict/<int:days>', methods=['POST'])
def predict(days):
    l = sarimax.forecast(days)
    return jsonify({'data': {'days':l.index.strftime("%Y-%m-%d").values.tolist(), 'pred':l.values.tolist()}})

@app.route('/plot', methods=['GET'])
def plot():
    msg = {}
    args = request.args
    year = args.get('year')
    str_c = args.get('coords')
    str_c = str_c.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    msg[year] = {}
    msg[year]['time'], msg[year]['dis'], msg[year]['temp'], msg[year]['prec'] = getYearData(year, c)
    if msg[year] == {}:
        return jsonify({"data": []})

    return jsonify({"data": msg})

@app.route("/")
def index():
 return render_template('index.html')

if __name__ == '__main__':
    app.run()