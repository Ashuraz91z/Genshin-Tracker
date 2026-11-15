using System;
using System.Linq;

namespace InventoryKamera
{
    public static class OcrFailure
    {
        public static string Describe(Exception error)
        {
            if(error is AggregateException aggregate)return string.Join(Environment.NewLine,aggregate.Flatten().InnerExceptions.Select(Describe));
            return error.GetType().Name+": "+error.Message+Environment.NewLine+error.StackTrace
                +(error.InnerException==null?"":Environment.NewLine+Describe(error.InnerException));
        }
    }
}
