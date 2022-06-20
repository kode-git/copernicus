from flask import Flask, jsonify, render_template, request
import pandas as pd 
import pickle
import numpy as np

sarimax = pickle.load(open('./static/model/sarimax', 'rb'))

df = {}
year = 2011 #year in the name of the file
for i in range(6, 17): #index in the name of the file
    df[year] = pd.read_csv('../../dtp_index/italy-dtp-'+str(year)+'-'+str(i)+'-index.csv', header = 0, names=['days', 'time', 'lat', 'lon', 'discharge', 'temp', 'prec'])
    df_drop = df[year].drop(columns = ['days', 'time', 'discharge', 'temp', 'prec'], inplace=False)
    df[year]['coords'] = df_drop.apply(tuple, axis=1)
    df[year]['time_2'] = df[year]['time']
    df[year] = df[year].set_index(['coords', 'time'])
    year += 1

def getYearData(year, c):
    if year not in df:
        return {}
    for coord, time in df[year].groupby(level=0):
        if coord[0] == c[0] and coord[1] == c[1]:
            lst = df[year].loc[coord, :]['time_2'].reset_index(drop=True).values.tolist()
            months = []
            for e in lst:
                val_y = e.split(' ')[0]
                splitted = val_y.split('-')
                months.append(splitted[2]+'-'+splitted[1]+'-'+splitted[0])
            dis_val = df[year].loc[c, :]['discharge'].reset_index(drop=True).values
            temp_val = df[year].loc[c, :]['temp'].reset_index(drop=True).values
            prec_val = df[year].loc[c, :]['prec'].reset_index(drop=True).values
            obj = {
                'data':{
                    'months':months,
                    'dis':{
                        'values':dis_val.tolist(),
                        'avg': np.mean(dis_val),
                        'var': np.var(dis_val)
                    },
                    'temp':{
                        'values':temp_val.tolist(),
                        'avg': np.mean(temp_val),
                        'var': np.var(temp_val)
                    },
                    'prec':{
                        'values':prec_val.tolist(),
                        'avg': np.mean(prec_val),
                        'var': np.var(prec_val)
                    }
                }
            }
            return obj
    return {}

app = Flask(__name__)

@app.route('/predict/<int:days>', methods=['POST'])
def predict(days):
    l = sarimax.forecast(days)
    return jsonify({'data': {'days':l.index.strftime("%Y-%m-%d").values.tolist(), 'pred':l.values.tolist()}})

@app.route('/plot', methods=['GET'])
def plot():
    data = {}
    str_c = request.args.get('coords')
    str_c = str_c.split(',')
    c = (float(str_c[1]), float(str_c[0]))
    for year in range(2011, 2022):
        data[year] = getYearData(year, c)
    return jsonify(data)


@app.route("/")
def index():
 return render_template('index.html')

if __name__ == '__main__':
    app.run()